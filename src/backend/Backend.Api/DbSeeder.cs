// Backend.Api/Infrastructure/DbSeeder.cs
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using System.Security.Cryptography;
using System.Text;

namespace Backend.Api.Infrastructure
{
    public class DbSeeder
    {
        private readonly AppDbContext _db;

        public DbSeeder(AppDbContext db)
        {
            _db = db;
        }

        public void Seed()
        {
            if (!_db.Database.CanConnect()) return;

            // --- ADD EXAMPLE CATEGORIES ---
            if (!_db.Categories.Any())
            {
                _db.Categories.AddRange(
                    new() { Id = 1, Name = "Default", Description = "Default category" },
                    new() { Id = 2, Name = "Food", Description = "Food & Grocery" },
                    new() { Id = 3, Name = "Drinks", Description = "Beverages" }
                );
                _db.SaveChanges();
            }

            // --- ADD EXAMPLE WAREHOUSES ---
            if (!_db.Warehouses.Any())
            {
                var addr = new Objects.Entities.Models.Address
                {
                    Country = "PL",
                    City = "Warszawa",
                    Street = "Prosta",
                    Building = "1",
                    PostalCode = "00-000"
                };
                _db.Addresses.Add(addr);
                _db.SaveChanges();

                _db.Warehouses.Add(new()
                {
                    Name = "Magazyn Główny",
                    AddressId = addr.Id
                });
                _db.SaveChanges();
            }

            // --- ADD EXAMPLE PRODUCTS ---
            if (!_db.Products.Any())
            {
                _db.Products.AddRange(
                    new() { SKU = "SKU-0001", Name = "Example Product 1", Description = "Demo cat 1", Price = 19.99m, CategoryId = 1 },
                    new() { SKU = "SKU-0002", Name = "Example Product 2", Description = "Demo cat 2", Price = 29.99m, CategoryId = 2 },
                    new() { SKU = "SKU-0003", Name = "Example Product 3", Description = "Demo cat 3", Price = 39.99m, CategoryId = 3 },
                    new() { SKU = "SKU-0004", Name = "Example Product 4", Description = "Demo cat 1", Price = 49.99m, CategoryId = 1 }
                );
                _db.SaveChanges();
            }
            // --- ADD ROOT USER ---
            if (!_db.Users.Any())
            {
                CreatePasswordHash("Root123!", out var hash, out var salt);

                var rootUser = new User
                {
                    FirstName = "System",
                    LastName = "Root",
                    Email = "root@system.local",
                    PhoneNumber = "000000000",
                    DateOfBirth = DateTime.UtcNow,
                    Role = UserRole.Root,
                    Address = new Address
                    {
                        Country = "PL",
                        City = "Warszawa",
                        Street = "Admin Street",
                        Building = "1",
                        PostalCode = "00-000"
                    },
                    Credentials = new UserCredential
                    {
                        Login = "root",
                        PasswordHash = Convert.ToBase64String(hash),
                        PasswordSalt = Convert.ToBase64String(salt),
                        IsActive = true
                    }
                };

                _db.Users.Add(rootUser);
                _db.SaveChanges();

                Console.WriteLine("Root user created: login='root', password='Root123!'");
            }
            else
            {
                Console.WriteLine("Root user already exists — skipping seeding.");
            }
        }

        private static void CreatePasswordHash(string password, out byte[] hash, out byte[] salt)
        {
            using var hmac = new HMACSHA512();
            salt = hmac.Key;
            hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
        }
    }
}