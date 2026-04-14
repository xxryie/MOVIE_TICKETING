using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieTicketing.API.Data;

namespace MovieTicketing.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SeatsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SeatsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("{showtimeId}")]
        public async Task<IActionResult> GetSeats(int showtimeId)
        {
            var seats = await _context.Seats
                .Where(s => s.ShowtimeId == showtimeId)
                .OrderBy(s => s.SeatRow).ThenBy(s => s.SeatCol)
                .ToListAsync();

            return Ok(new { success = true, data = seats });
        }
    }
}
