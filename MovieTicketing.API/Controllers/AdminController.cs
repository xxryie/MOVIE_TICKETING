using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieTicketing.API.Data;
using MovieTicketing.API.Models;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace MovieTicketing.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AdminController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AdminController(AppDbContext context)
        {
            _context = context;
        }

        // --- DASHBOARD STATS ---
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            try
            {
                var totalBookings = await _context.Reservations.CountAsync();
                var totalRevenue = await _context.Reservations.AnyAsync() 
                    ? await _context.Reservations.SumAsync(r => r.TotalAmount) 
                    : 0m;
                var activeMovies = await _context.Movies.CountAsync(m => m.Status == "now_showing");
                
                // Get ticket sales per movie for charts
                var movieSales = await _context.Movies
                    .Select(m => new {
                        Id = m.Id,
                        Title = m.Title,
                        TicketsSold = m.Showtimes.SelectMany(s => s.Reservations).Count(),
                        Revenue = m.Showtimes.SelectMany(s => s.Reservations).Any()
                            ? m.Showtimes.SelectMany(s => s.Reservations).Sum(r => r.TotalAmount)
                            : 0m
                    })
                    .OrderByDescending(m => m.TicketsSold)
                    .Take(5)
                    .ToListAsync();

                // Get daily revenue trend for the last 14 days
                var startDate = DateTime.UtcNow.Date.AddDays(-13);
                var dailyTrendQuery = await _context.Reservations
                    .Where(r => r.CreatedAt >= startDate)
                    .OrderBy(r => r.CreatedAt)
                    .Select(r => new { r.CreatedAt, r.TotalAmount })
                    .ToListAsync();

                var dailyTrend = dailyTrendQuery
                    .GroupBy(r => r.CreatedAt.Date)
                    .Select(g => new {
                        Date = g.Key.ToString("MMM dd"),
                        Revenue = g.Sum(x => x.TotalAmount)
                    })
                    .ToList();

                // Ensure all 14 days are present (zero-fill missing dates)
                var filledTrend = new List<object>();
                for (int i = 13; i >= 0; i--)
                {
                    var date = DateTime.UtcNow.Date.AddDays(-i);
                    var dateStr = date.ToString("MMM dd");
                    var existing = dailyTrend.FirstOrDefault(t => t.Date == dateStr);
                    filledTrend.Add(new {
                        Date = dateStr,
                        Revenue = existing?.Revenue ?? 0m
                    });
                }

                return Ok(new {
                    success = true,
                    data = new {
                        totalBookings,
                        totalRevenue,
                        activeMovies,
                        movieSales,
                        revenueTrend = filledTrend,
                        topMovie = movieSales.FirstOrDefault()
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Error fetching stats", error = ex.Message });
            }
        }

        [HttpGet("movies")]
        public async Task<IActionResult> GetMovies()
        {
            try
            {
                var movies = await _context.Movies
                    .Include(m => m.Showtimes.OrderByDescending(s => s.ShowTime))
                    .OrderByDescending(m => m.CreatedAt)
                    .ToListAsync();
                return Ok(new { success = true, data = movies });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Error fetching movies", error = ex.Message });
            }
        }

        // --- MOVIES CRUD ---
        [HttpPost("movies")]
        public async Task<IActionResult> AddMovie([FromBody] Movie movie)
        {
            if (movie == null) return BadRequest(new { success = false, message = "Invalid data" });
            
            try
            {
                _context.Movies.Add(movie);
                await _context.SaveChangesAsync();
                return Ok(new { success = true, data = movie });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Failed to add movie", error = ex.Message });
            }
        }

        [HttpPut("movies/{id}")]
        public async Task<IActionResult> UpdateMovie(int id, [FromBody] Movie updateData)
        {
            var movie = await _context.Movies.FindAsync(id);
            if (movie == null) return NotFound(new { success = false, message = "Movie not found" });

            try
            {
                movie.Title = updateData.Title;
                movie.PosterUrl = updateData.PosterUrl;
                movie.Genre = updateData.Genre;
                movie.DurationMinutes = updateData.DurationMinutes;
                movie.Status = updateData.Status; // 'now_showing' or 'coming_soon'
                movie.Language = updateData.Language;
                movie.Rating = updateData.Rating;
                movie.Synopsis = updateData.Synopsis;
                movie.Price = updateData.Price;
                movie.TrailerUrl = updateData.TrailerUrl;
                movie.Cast = updateData.Cast;

                await _context.SaveChangesAsync();
                return Ok(new { success = true, data = movie });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Failed to update movie", error = ex.Message });
            }
        }

        [HttpDelete("movies/{id}")]
        public async Task<IActionResult> DeleteMovie(int id)
        {
            var movie = await _context.Movies.FindAsync(id);
            if (movie == null) return NotFound(new { success = false, message = "Movie not found" });

            try
            {
                // This will cascade delete if EF Core is configured that way, or we manually remove.
                // SQLite default cascade delete is often off or requires specific navigation rules. 
                // For safety, let the context handle it.
                _context.Movies.Remove(movie);
                await _context.SaveChangesAsync();
                return Ok(new { success = true, message = "Movie deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Failed to delete movie. It might have existing reservations.", error = ex.Message });
            }
        }

        // --- SHOWTIMES CRUD ---
        [HttpPost("showtimes")]
        public async Task<IActionResult> AddShowtime([FromBody] Showtime showtime)
        {
            if (showtime == null) return BadRequest(new { success = false, message = "Invalid data" });
            
            try
            {
                // Verify movie exists
                if (!await _context.Movies.AnyAsync(m => m.Id == showtime.MovieId))
                    return BadRequest(new { success = false, message = "Movie ID not found" });

                // Ensure DateTime is UTC for PostgreSQL
                showtime.ShowTime = DateTime.SpecifyKind(showtime.ShowTime, DateTimeKind.Utc);

                _context.Showtimes.Add(showtime);
                await _context.SaveChangesAsync();
                
                // Dynamic Seat Generation based on Cinema Type
                var seats = new List<Seat>();
                string[] rows = { "A", "B", "C", "D" };
                int cols = 8;

                if (showtime.CinemaType == "IMAX") {
                    rows = new string[] { "A", "B", "C", "D", "E", "F", "G", "H" };
                    cols = 12;
                } else if (showtime.CinemaType == "Directors Club") {
                    rows = new string[] { "A", "B", "C", "D" };
                    cols = 6;
                } else { // Standard
                    rows = new string[] { "A", "B", "C", "D", "E", "F" };
                    cols = 10;
                }

                foreach (var row in rows)
                {
                    for (int col = 1; col <= cols; col++)
                    {
                        seats.Add(new Seat
                        {
                            ShowtimeId = showtime.Id,
                            SeatRow = row,
                            SeatCol = col,
                            Status = "available"
                        });
                    }
                }
                
                _context.Seats.AddRange(seats);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, data = showtime, message = $"Showtime and {seats.Count} seats generated." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Failed to add showtime", error = ex.Message });
            }
        }

        [HttpDelete("showtimes/{id}")]
        public async Task<IActionResult> DeleteShowtime(int id)
        {
            var st = await _context.Showtimes.FindAsync(id);
            if (st == null) return NotFound(new { success = false, message = "Showtime not found" });

            try
            {
                _context.Showtimes.Remove(st);
                await _context.SaveChangesAsync();
                return Ok(new { success = true, message = "Showtime deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Failed to delete showtime.", error = ex.Message });
            }
        }

        // --- REPORTS & OCCUPANCY ---
        [HttpGet("reports")]
        public async Task<IActionResult> GetReports()
        {
            try
            {
                var reports = await _context.Reservations
                    .Include(r => r.User)
                    .Include(r => r.Showtime)
                    .ThenInclude(s => s.Movie)
                    .Include(r => r.Payment)
                    .OrderByDescending(r => r.CreatedAt)
                    .Select(r => new {
                        Id = r.Id,
                        User = r.User.Username,
                        Movie = r.Showtime.Movie.Title,
                        Showtime = r.Showtime.ShowTime,
                        ShowtimeId = r.ShowtimeId,
                        Amount = r.TotalAmount,
                        PaymentMethod = r.Payment.PaymentMethod,
                        PaymentRef = r.Payment.PaymentRef,
                        Date = r.CreatedAt
                    })
                    .ToListAsync();

                return Ok(new { success = true, data = reports });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Error fetching reports", error = ex.Message });
            }
        }

        [HttpGet("occupancy/{showtimeId}")]
        public async Task<IActionResult> GetOccupancy(int showtimeId)
        {
            try
            {
                var seats = await _context.Seats
                    .Where(s => s.ShowtimeId == showtimeId)
                    .OrderBy(s => s.SeatRow)
                    .ThenBy(s => s.SeatCol)
                    .ToListAsync();

                var reservations = await _context.Reservations
                    .Where(r => r.ShowtimeId == showtimeId)
                    .Include(r => r.User)
                    .ToListAsync();

                var data = seats.Select(s => {
                    var reservation = reservations.FirstOrDefault(r => r.SeatId == s.Id);
                    return new {
                        Id = s.Id,
                        Row = s.SeatRow,
                        Col = s.SeatCol,
                        Status = s.Status,
                        BookedBy = reservation?.User?.Username ?? null
                    };
                });

                return Ok(new { success = true, data = data });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Error fetching occupancy", error = ex.Message });
            }
        }
    }
}
