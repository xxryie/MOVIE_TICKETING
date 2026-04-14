using Microsoft.EntityFrameworkCore;
using MovieTicketing.API.Data;
using MovieTicketing.API.Models;
using MovieTicketing.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});

// Add DbContext
var rawConnStr = Environment.GetEnvironmentVariable("DATABASE_URL") 
    ?? builder.Configuration.GetConnectionString("DefaultConnection");

// Auto-convert URI format (postgresql://...) to ADO.NET format (Host=...;)
string connectionString;
if (rawConnStr != null && rawConnStr.StartsWith("postgres"))
{
    var uri = new Uri(rawConnStr);
    var userInfo = uri.UserInfo.Split(':');
    connectionString = $"Host={uri.Host};Port={uri.Port};Username={userInfo[0]};Password={userInfo[1]};Database={uri.AbsolutePath.TrimStart('/')};SSL Mode=Require;Trust Server Certificate=true;";
}
else
{
    connectionString = rawConnStr ?? "";
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// Add JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });

// Add CORS policy for React Frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddOpenApi();
builder.Services.AddHostedService<QueueCleanupService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("AllowReactApp");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Apply migrations automatically on startup (for simplicity)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated(); // Creates SQLite db file and tables if missing

    // DATABASE MAINTENANCE: Upgrade seats for existing showtimes
    var showtimesToUpgrade = db.Showtimes
        .Include(s => s.Seats)
        .Where(s => s.Seats.Count <= 32) // Identify "old" or incomplete layouts
        .ToList();

    if (showtimesToUpgrade.Any())
    {
        foreach (var st in showtimesToUpgrade)
        {
            // Remove old seats and related reservations
            var oldSeats = db.Seats.Where(s => s.ShowtimeId == st.Id).ToList();
            var seatIds = oldSeats.Select(s => s.Id).ToList();
            var relatedReservations = db.Reservations.Where(r => seatIds.Contains(r.SeatId)).ToList();
            var reservationIds = relatedReservations.Select(r => r.Id).ToList();
            var relatedPayments = db.Payments.Where(p => reservationIds.Contains(p.ReservationId)).ToList();

            db.Payments.RemoveRange(relatedPayments);
            db.Reservations.RemoveRange(relatedReservations);
            db.Seats.RemoveRange(oldSeats);
            db.SaveChanges();

            // Re-generate seats based on CinemaType
            string[] rows;
            int cols;

            if (st.CinemaType == "IMAX") {
                rows = new[] { "A", "B", "C", "D", "E", "F", "G", "H" };
                cols = 12;
            } else if (st.CinemaType == "Directors Club") {
                rows = new[] { "A", "B", "C", "D" };
                cols = 6;
            } else { // Standard
                rows = new[] { "A", "B", "C", "D", "E", "F" };
                cols = 10;
            }

            foreach (var rowName in rows)
            {
                for (int col = 1; col <= cols; col++)
                {
                    db.Seats.Add(new Seat
                    {
                        ShowtimeId = st.Id,
                        SeatRow = rowName,
                        SeatCol = col,
                        Status = "available"
                    });
                }
            }
            db.SaveChanges();
        }
    }

    DbSeeder.Seed(db); // Add initial data
}

app.Run();
