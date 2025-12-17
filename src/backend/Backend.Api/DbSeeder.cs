using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Enums;
using Backend.Api.Objects.Entities.Models;
using Backend.Api.Objects.Entities.Models.Relations;
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

            // --- ADD MAIN COMPANY ADDRESS FIRST (for incoming shipments receiver) ---
            // IMPORTANT: This must be the first address created to ensure it gets ID 1
            Address mainCompanyAddress;
            var existingMainCompanyAddress = _db.Addresses.FirstOrDefault(a =>
                a.Street == "Main Street" &&
                a.Building == "123" &&
                a.PostalCode == "00-950" &&
                a.City == "Warszawa");

            if (existingMainCompanyAddress == null)
            {
                mainCompanyAddress = new Address
                {
                    Country = Country.Poland,
                    City = "Warszawa",
                    Street = "Main Street",
                    Building = "123",
                    PostalCode = "00-950"
                };
                _db.Addresses.Add(mainCompanyAddress);
                _db.SaveChanges();
                Console.WriteLine("Main company address created (ID 1).");
            }
            else
            {
                mainCompanyAddress = existingMainCompanyAddress;
                Console.WriteLine($"Main company address already exists (ID {mainCompanyAddress.Id}).");
            }

            // --- ADD EXAMPLE CATEGORIES ---
            if (!_db.Categories.Any())
            {
                _db.Categories.AddRange(
                    new() {Name = "Default", Description = "Default category" },
                    new() {Name = "Food", Description = "Food & Grocery" },
                    new() {Name = "Drinks", Description = "Beverages" }
                );
                _db.SaveChanges();
            }

            // --- ADD EXAMPLE LOCATIONS ---
            if (!_db.Locations.Any())
            {
                var locations = new[]
                {
                    new Location { Zone = "A001", Col = "B001", Shelf = "C001", LocationCode = "A001-B001-C001" },
                    new Location { Zone = "A001", Col = "B001", Shelf = "C002", LocationCode = "A001-B001-C002" },
                    new Location { Zone = "A001", Col = "B002", Shelf = "C001", LocationCode = "A001-B002-C001" },
                    new Location { Zone = "A002", Col = "B001", Shelf = "C001", LocationCode = "A002-B001-C001" },
                    new Location { Zone = "A002", Col = "B002", Shelf = "C001", LocationCode = "A002-B002-C001" }
                };
                _db.Locations.AddRange(locations);
                _db.SaveChanges();
            }

            // --- ADD EXAMPLE TAX RATES ---
            if (!_db.TaxRates.Any())
            {
                _db.TaxRates.AddRange(
                    new() { Code = "VAT23", Rate = 0.23m, IsActive = true },
                    new() { Code = "VAT8", Rate = 0.08m, IsActive = true },
                    new() { Code = "VAT0", Rate = 0.00m, IsActive = true }
                );
                _db.SaveChanges();
            }

            // --- ADD EXAMPLE PRODUCTS ---
            var vat23Id = _db.TaxRates.FirstOrDefault(x => x.Code == "VAT23")?.Id ?? 1;

            var defaultCatId = _db.Categories.FirstOrDefault(x => x.Name == "Default")?.Id ?? 1;
            var foodCatId = _db.Categories.FirstOrDefault(x => x.Name == "Food")?.Id ?? 1;
            var drinksCatId = _db.Categories.FirstOrDefault(x => x.Name == "Drinks")?.Id ?? 1;

            if (!_db.Products.Any())
            {
                _db.Products.AddRange(
                    new() { SKU = "SKU-0001", Name = "Example Product 1", Description = "Demo cat 1", Price = 19.99m, CategoryId = defaultCatId, TaxRateId = vat23Id },
                    new() { SKU = "SKU-0002", Name = "Example Product 2", Description = "Demo cat 2", Price = 29.99m, CategoryId = foodCatId, TaxRateId = vat23Id },
                    new() { SKU = "SKU-0003", Name = "Example Product 3", Description = "Demo cat 3", Price = 39.99m, CategoryId = drinksCatId, TaxRateId = vat23Id },
                    new() { SKU = "SKU-0004", Name = "Example Product 4", Description = "Demo cat 1", Price = 49.99m, CategoryId = defaultCatId, TaxRateId = vat23Id }
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
                        Country = Country.Poland,
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

            // --- ADD EXAMPLE SHIPMENTS ---
            // Note: mainCompanyAddress was created at the beginning of this method
            if (!_db.Shipments.Any())
            {
                var senderAddress = new Address
                {
                    Country = Country.Germany,
                    City = "Berlin",
                    Street = "Supplier Street",
                    Building = "10",
                    PostalCode = "10115"
                };
                _db.Addresses.Add(senderAddress);
                _db.SaveChanges();

                // Use main company address as receiver for incoming shipments
                var receiverAddress = mainCompanyAddress;

                var product1 = _db.Products.FirstOrDefault(x => x.SKU == "SKU-0001");
                var product2 = _db.Products.FirstOrDefault(x => x.SKU == "SKU-0002");

                var shipment1 = new Shipment
                {
                    Type = ShipmentType.Incoming,
                    Status = ShipmentStatus.InPreparation,
                    SenderName = "Example Supplier GmbH",
                    SenderTaxId = "DE123456789",
                    SenderAddressId = senderAddress.Id,
                    ReceiverName = "Main Store",
                    ReceiverTaxId = "1234567890",
                    ReceiverAddressId = receiverAddress.Id,
                    Weight = 15.5m,
                    Length = 50,
                    Width = 40,
                    Height = 30,
                    Description = "Example incoming shipment"
                };
                _db.Shipments.Add(shipment1);
                _db.SaveChanges();

                if (product1 != null)
                {
                    _db.ShipmentProducts.Add(new ShipmentProduct
                    {
                        ShipmentId = shipment1.Id,
                        ProductId = product1.Id,
                        Quantity = 10
                    });
                }
                if (product2 != null)
                {
                    _db.ShipmentProducts.Add(new ShipmentProduct
                    {
                        ShipmentId = shipment1.Id,
                        ProductId = product2.Id,
                        Quantity = 5
                    });
                }
                _db.SaveChanges();

                Console.WriteLine("Example shipment created.");
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