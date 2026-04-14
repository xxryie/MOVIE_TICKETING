using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieTicketing.API.Data;
using MovieTicketing.API.Models;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;

namespace MovieTicketing.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;

        public AuthController(AppDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            if (await _context.Users.AnyAsync(u => u.Username == dto.Username || u.Email == dto.Email))
            {
                return BadRequest(new { success = false, message = "Username or email already exists." });
            }

            var user = new User
            {
                Username = dto.Username,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password)
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, user_id = user.Id, username = user.Username });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            // First check for Admin
            var admin = await _context.Admins.FirstOrDefaultAsync(a => a.Username == dto.Username);
            if (admin != null && BCrypt.Net.BCrypt.Verify(dto.Password, admin.PasswordHash))
            {
                var token = GenerateToken(admin.Id.ToString(), admin.Username, "Admin");
                return Ok(new { success = true, token, user_id = admin.Id, username = admin.Username, role = "admin" });
            }

            // Then check for regular User
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == dto.Username);
            if (user != null && BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            {
                var token = GenerateToken(user.Id.ToString(), user.Username, "User");
                return Ok(new { success = true, token, user_id = user.Id, username = user.Username, role = "user" });
            }

            return Unauthorized(new { success = false, message = "Invalid username or password" });
        }

        private string GenerateToken(string id, string username, string role)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, id),
                new Claim(ClaimTypes.Name, username),
                new Claim(ClaimTypes.Role, role)
            };

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddDays(1),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    public class RegisterDto
    {
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class LoginDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}
