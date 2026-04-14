using Microsoft.EntityFrameworkCore;
using MovieTicketing.API.Models;
using MovieTicketing.API.Data;
using System;
using System.Linq;
using BCrypt.Net;

namespace MovieTicketing.API.Data
{
    public static class DbSeeder
    {
        public static void Seed(AppDbContext context)
        {
            context.Database.EnsureCreated();

            if (!context.Admins.Any())
            {
                context.Admins.Add(new Admin
                {
                    Username = "admin",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123")
                });
            }

            if (!context.Users.Any())
            {
                context.Users.Add(new User
                {
                    Username = "guest",
                    Email = "guest@example.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("guest123")
                });
            }

            if (!context.Movies.Any())
            {
                var movie1 = new Movie
                {
                    Title = "Avengers: End Game",
                    Synopsis = "The epic conclusion to the Infinity Saga.",
                    DurationMinutes = 181,
                    Status = "now_showing",
                    Price = 350, // Standard Price
                    PosterUrl = "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
                    Genre = "Action, Sci-Fi",
                    Director = "Anthony Russo, Joe Russo",
                    Cast = "Robert Downey Jr., Chris Evans, Mark Ruffalo",
                    TrailerUrl = "https://www.youtube.com/embed/TcMBFSGVi1c"
                };

                var movie2 = new Movie
                {
                    Title = "Avengers: Infinity War",
                    Synopsis = "The Avengers must defeat the powerful Thanos.",
                    DurationMinutes = 149,
                    Status = "now_showing",
                    Price = 550, // IMAX Price
                    PosterUrl = "https://image.tmdb.org/t/p/w500/7WsyChQZ3ZpIkyUvNifpYVZW3Hq.jpg",
                    Genre = "Action, Sci-Fi",
                    Director = "Anthony Russo",
                    Cast = "Chris Hemsworth, Robert Downey Jr.",
                    TrailerUrl = "https://www.youtube.com/embed/6ZfuNTqbHE8"
                };

                var movie3 = new Movie
                {
                    Title = "Avengers: Age of Ultron",
                    Synopsis = "Tony Stark tries to jump-start a peacekeeping program called Ultron.",
                    DurationMinutes = 141,
                    Status = "now_showing",
                    Price = 250,
                    PosterUrl = "https://image.tmdb.org/t/p/w500/t90Y3GZIGQp0RmO6STHhaDv9oGa.jpg",
                    Genre = "Action, Sci-Fi",
                    Director = "Joss Whedon",
                    Cast = "Scarlett Johansson",
                    TrailerUrl = "https://www.youtube.com/embed/tmeOjFno6Do"
                };

                var movie4 = new Movie
                {
                    Title = "Captain America: Civil War",
                    Synopsis = "Political involvement causes a rift between Captain America and Iron Man.",
                    DurationMinutes = 147,
                    Status = "now_showing",
                    Price = 750, // Directors Club Price
                    PosterUrl = "https://image.tmdb.org/t/p/w500/rAG2vKdySTBM9czS3uY2UdyH1jA.jpg",
                    Genre = "Action, Sci-Fi",
                    Director = "Anthony Russo",
                    Cast = "Chris Evans",
                    TrailerUrl = "https://www.youtube.com/embed/dKrVegVI0Us"
                };

                context.Movies.AddRange(movie1, movie2, movie3, movie4);
                context.SaveChanges();

                foreach (var m in new[] { movie1, movie2, movie3, movie4 })
                {
                    string cinemaType = "Standard";
                    string[] rows = new[] { "A", "B", "C", "D", "E", "F" };
                    int cols = 10;

                    if (m.Title.Contains("Infinity War")) {
                        cinemaType = "IMAX";
                        rows = new[] { "A", "B", "C", "D", "E", "F", "G", "H" };
                        cols = 12;
                    } else if (m.Title.Contains("Civil War")) {
                        cinemaType = "Directors Club";
                        rows = new[] { "A", "B", "C", "D" };
                        cols = 6;
                    }

                    var showtime = new Showtime
                    {
                        MovieId = m.Id,
                        ShowTime = DateTime.UtcNow.Date.AddDays(1).AddHours(14), // Default to 2 PM tomorrow
                        CinemaType = cinemaType
                    };
                    context.Showtimes.Add(showtime);
                    context.SaveChanges();

                    foreach (var row in rows)
                    {
                        for (int col = 1; col <= cols; col++)
                        {
                            context.Seats.Add(new Seat
                            {
                                ShowtimeId = showtime.Id,
                                SeatRow = row,
                                SeatCol = col,
                                Status = "available"
                            });
                        }
                    }
                }
            }
            context.SaveChanges();
        }
    }
}
