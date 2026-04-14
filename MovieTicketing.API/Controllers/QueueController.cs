using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieTicketing.API.Data;
using MovieTicketing.API.Models;
using System.Security.Claims;

namespace MovieTicketing.API.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class QueueController : ControllerBase
    {
        private readonly AppDbContext _context;
        private const int MAX_BOOKING_MINUTES = 5;

        public QueueController(AppDbContext context)
        {
            _context = context;
        }

        private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        [HttpPost("join/{showtimeId}")]
        public async Task<IActionResult> JoinQueue(int showtimeId)
        {
            var userId = CurrentUserId;

            // 1. Check if user already has an entry for this showtime
            var existing = await _context.BookingQueue
                .FirstOrDefaultAsync(q => q.ShowtimeId == showtimeId && q.UserId == userId);

            if (existing != null)
            {
                // If active and not expired, just return success
                if (existing.Status == "Active" && existing.ExpiresAt > DateTime.UtcNow)
                {
                    return Ok(new { success = true, status = "Active", expiresAt = existing.ExpiresAt });
                }
                
                // If waiting, just return current status
                if (existing.Status == "Waiting")
                {
                    return await GetStatus(showtimeId);
                }

                // If expired, we'll re-evaluate below
                _context.BookingQueue.Remove(existing);
                await _context.SaveChangesAsync();
            }

            // 2. Check if anyone is currently Active for this showtime
            var activeSession = await _context.BookingQueue
                .FirstOrDefaultAsync(q => q.ShowtimeId == showtimeId && q.Status == "Active" && q.ExpiresAt > DateTime.UtcNow);

            if (activeSession == null)
            {
                // Room is empty! Make the user active immediately
                var newSession = new BookingQueue
                {
                    ShowtimeId = showtimeId,
                    UserId = userId,
                    Status = "Active",
                    ExpiresAt = DateTime.UtcNow.AddMinutes(MAX_BOOKING_MINUTES),
                    CreatedAt = DateTime.UtcNow
                };
                _context.BookingQueue.Add(newSession);
                await _context.SaveChangesAsync();
                return Ok(new { success = true, status = "Active", expiresAt = newSession.ExpiresAt });
            }
            else
            {
                // Room is occupied, join the waiting list
                var newWaiting = new BookingQueue
                {
                    ShowtimeId = showtimeId,
                    UserId = userId,
                    Status = "Waiting",
                    CreatedAt = DateTime.UtcNow
                };
                _context.BookingQueue.Add(newWaiting);
                await _context.SaveChangesAsync();
                return await GetStatus(showtimeId);
            }
        }

        [HttpGet("status/{showtimeId}")]
        public async Task<IActionResult> GetStatus(int showtimeId)
        {
            var userId = CurrentUserId;
            var entry = await _context.BookingQueue
                .FirstOrDefaultAsync(q => q.ShowtimeId == showtimeId && q.UserId == userId);

            // Fetch MovieId for redirection
            var showtime = await _context.Showtimes.FindAsync(showtimeId);
            var movieId = showtime?.MovieId;

            if (entry == null) return NotFound(new { message = "No queue entry found." });

            if (entry.Status == "Active")
            {
                if (entry.ExpiresAt < DateTime.UtcNow)
                {
                    return Ok(new { status = "Expired" });
                }
                return Ok(new { status = "Active", expiresAt = entry.ExpiresAt, movieId = movieId });
            }

            // Calculate position: how many Waiting users for THIS showtime have an earlier CreatedAt?
            var usersAhead = await _context.BookingQueue
                .CountAsync(q => q.ShowtimeId == showtimeId && q.Status == "Waiting" && q.CreatedAt < entry.CreatedAt);


            // Estimate wait time: (Active User Time Remaining) + (Users Ahead * 3 mins)
            var activeUser = await _context.BookingQueue
                .FirstOrDefaultAsync(q => q.ShowtimeId == showtimeId && q.Status == "Active" && q.ExpiresAt > DateTime.UtcNow);
            
            double remainingMins = 0;
            if (activeUser != null && activeUser.ExpiresAt.HasValue)
            {
                remainingMins = (activeUser.ExpiresAt.Value - DateTime.UtcNow).TotalMinutes;
            }

            double estimatedWaitMinutes = Math.Max(0, remainingMins + (usersAhead * 3));

            return Ok(new {
                status = "Waiting",
                position = usersAhead + 1,
                usersAhead = usersAhead,
                estimatedWaitMinutes = Math.Round(estimatedWaitMinutes, 1),
                movieId = movieId
            });
        }

        [HttpPost("heartbeat/{showtimeId}")]
        public async Task<IActionResult> Heartbeat(int showtimeId)
        {
            var userId = CurrentUserId;
            var entry = await _context.BookingQueue
                .FirstOrDefaultAsync(q => q.ShowtimeId == showtimeId && q.UserId == userId && q.Status == "Active");

            if (entry == null) return Unauthorized(new { message = "No active booking session found." });

            // Refresh expiry
            entry.ExpiresAt = DateTime.UtcNow.AddMinutes(MAX_BOOKING_MINUTES);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, expiresAt = entry.ExpiresAt });
        }

        [HttpPost("exit/{showtimeId}")]
        public async Task<IActionResult> Exit(int showtimeId)
        {
            var userId = CurrentUserId;
            var entry = await _context.BookingQueue
                .FirstOrDefaultAsync(q => q.ShowtimeId == showtimeId && q.UserId == userId);

            if (entry != null)
            {
                _context.BookingQueue.Remove(entry);
                await _context.SaveChangesAsync();
            }

            return Ok(new { success = true });
        }
    }
}
