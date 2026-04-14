using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieTicketing.API.Data;
using MovieTicketing.API.Models;

namespace MovieTicketing.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MoviesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MoviesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetMovies()
        {
            var now = DateTime.UtcNow;
            
            var movies = await _context.Movies
                .Include(m => m.Showtimes.Where(s => s.ShowTime > now))
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

            return Ok(new { success = true, data = movies });
        }
    }
}
