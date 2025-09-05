// Backend.Api/Infrastructure/DbSeeder.cs
using Backend.Api.Objects.Entities;

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

            if (!_db.Categories.Any())
            {
                _db.Categories.AddRange(
                    new() { Id = 1, Name = "Default", Description = "Default category" },
                    new() { Id = 2, Name = "Food", Description = "Food & Grocery" },
                    new() { Id = 3, Name = "Drinks", Description = "Beverages" }
                );
                _db.SaveChanges();
            }

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

            if (!_db.Products.Any())
            {
                _db.Products.Add(new()
                {
                    SKU = "SKU-0001",
                    Name = "Przykładowy produkt",
                    Description = "Demo",
                    Price = 9.99m,
                    CategoryId = 1
                });
                _db.SaveChanges();
            }
        }
    }
}
