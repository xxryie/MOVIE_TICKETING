using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieTicketing.API.Data;
using MovieTicketing.API.Models;
using System.Security.Claims;
using System.Security.Cryptography;

namespace MovieTicketing.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReservationsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ReservationsController(AppDbContext context)
        {
            _context = context;
        }

        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Reserve([FromBody] ReservationRequest dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            
            if (dto.SeatIds == null || !dto.SeatIds.Any())
                return BadRequest(new { success = false, message = "Missing seats" });

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var reservedSeats = new List<int>();
                var failedSeats = new List<int>();
                var receiptToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLower();

                var showtime = await _context.Showtimes.Include(s => s.Movie).FirstOrDefaultAsync(s => s.Id == dto.ShowtimeId);
                if (showtime == null) return NotFound(new { success = false, message = "Showtime not found" });
                
                var price = showtime.Movie?.Price ?? 250.00m;

                foreach (var seatId in dto.SeatIds)
                {
                    var seat = await _context.Seats.FirstOrDefaultAsync(s => s.Id == seatId && s.ShowtimeId == dto.ShowtimeId && s.Status == "available");
                    
                    if (seat != null)
                    {
                        seat.Status = "reserved";
                        
                        var reservation = new Reservation
                        {
                            ShowtimeId = dto.ShowtimeId,
                            SeatId = seatId,
                            UserId = userId,
                            ReceiptToken = receiptToken,
                            TotalAmount = price
                        };
                        
                        var payment = new Payment
                        {
                            Reservation = reservation,
                            UserId = userId,
                            Amount = price,
                            PaymentMethod = dto.PaymentMethod,
                            PaymentRef = dto.PaymentRef
                        };

                        _context.Reservations.Add(reservation);
                        _context.Payments.Add(payment);
                        reservedSeats.Add(seatId);
                    }
                    else
                    {
                        failedSeats.Add(seatId);
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                if (!failedSeats.Any())
                    return Ok(new { success = true, message = "All selected seats successfully reserved!", reserved = reservedSeats, receipt_token = receiptToken });
                else if (!reservedSeats.Any())
                    return BadRequest(new { success = false, message = "Reservation failed. Seats were already taken.", failed = failedSeats });
                else
                    return Ok(new { success = true, message = "Partial success.", reserved = reservedSeats, failed = failedSeats, receipt_token = receiptToken });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { success = false, message = "Database error: " + ex.Message });
            }
        }

        [HttpGet("receipt/{token}")]
        public async Task<IActionResult> GetByToken(string token)
        {
            var reservations = await _context.Reservations
                .Include(r => r.Showtime)
                .ThenInclude(s => s!.Movie)
                .Include(r => r.Seat)
                .Where(r => r.ReceiptToken == token)
                .ToListAsync();

            if (!reservations.Any())
                return NotFound(new { success = false, message = "Receipt not found" });

            var first = reservations.First();
            var result = new
            {
                success = true,
                data = new
                {
                    movieTitle = first.Showtime?.Movie?.Title,
                    showTime = first.Showtime?.ShowTime,
                    seats = reservations.Select(r => $"{r.Seat?.SeatRow}{r.Seat?.SeatCol}").ToList(),
                    totalAmount = reservations.Sum(r => r.TotalAmount),
                    token = first.ReceiptToken,
                    status = first.Status,
                    createdAt = first.CreatedAt
                }
            };

            return Ok(result);
        }
    }

    public class ReservationRequest
    {
        public int ShowtimeId { get; set; }
        public List<int> SeatIds { get; set; } = new();
        public string PaymentMethod { get; set; } = "gcash";
        public string? PaymentRef { get; set; }
    }
}
