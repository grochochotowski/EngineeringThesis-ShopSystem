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
                    new() {Name = "Default", Description = "Default category", IsActive = true },
                    new() {Name = "Food", Description = "Food & Grocery", IsActive = true },
                    new() {Name = "Drinks", Description = "Beverages", IsActive = true }
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
                    // Gift Card - Special Product (MUST BE FIRST)
                    new() { SKU = "_gc", EAN = "0000000000001", Name = "Gift Card", Description = "Digital gift card - value set during purchase", Price = 0.00m, CategoryId = defaultCatId, TaxRateId = vat23Id },

                    // Default Category Products
                    new() { SKU = "SKU-0001", EAN = "5901234500016", Name = "Wireless Mouse", Description = "Ergonomic wireless mouse with USB receiver", Price = 29.99m, CategoryId = defaultCatId, TaxRateId = vat23Id },
                    new() { SKU = "SKU-0002", EAN = "5901234500023", Name = "USB Cable Type-C", Description = "High-speed USB Type-C cable, 2m", Price = 12.99m, CategoryId = defaultCatId, TaxRateId = vat23Id },
                    new() { SKU = "SKU-0003", EAN = "5901234500030", Name = "Bluetooth Headphones", Description = "Over-ear wireless headphones with noise cancellation", Price = 89.99m, CategoryId = defaultCatId, TaxRateId = vat23Id },
                    new() { SKU = "SKU-0004", EAN = "5901234500047", Name = "Laptop Stand", Description = "Adjustable aluminum laptop stand", Price = 45.50m, CategoryId = defaultCatId, TaxRateId = vat23Id },
                    new() { SKU = "SKU-0005", EAN = "5901234500054", Name = "Phone Case", Description = "Protective silicone phone case", Price = 15.99m, CategoryId = defaultCatId, TaxRateId = vat23Id },

                    // Food Category Products
                    new() { SKU = "SKU-1001", EAN = "5901234501013", Name = "Organic Pasta", Description = "Whole wheat organic pasta, 500g", Price = 4.99m, CategoryId = foodCatId, TaxRateId = vat23Id },
                    new() { SKU = "SKU-1002", EAN = "5901234501020", Name = "Extra Virgin Olive Oil", Description = "Cold-pressed extra virgin olive oil, 750ml", Price = 12.50m, CategoryId = foodCatId, TaxRateId = vat23Id },
                    new() { SKU = "SKU-1003", EAN = "5901234501037", Name = "Dark Chocolate Bar", Description = "70% cocoa dark chocolate, 100g", Price = 3.99m, CategoryId = foodCatId, TaxRateId = vat23Id },
                    new() { SKU = "SKU-1004", EAN = "5901234501044", Name = "Honey Jar", Description = "Natural wildflower honey, 500g", Price = 8.99m, CategoryId = foodCatId, TaxRateId = vat23Id },
                    new() { SKU = "SKU-1005", EAN = "5901234501051", Name = "Almonds Pack", Description = "Roasted and salted almonds, 200g", Price = 6.75m, CategoryId = foodCatId, TaxRateId = vat23Id },
                    new() { SKU = "SKU-1006", EAN = "5901234501068", Name = "Green Tea Box", Description = "Premium green tea, 20 bags", Price = 5.50m, CategoryId = foodCatId, TaxRateId = vat23Id },

                    // Drinks Category Products
                    new() { SKU = "SKU-2001", EAN = "5901234502010", Name = "Mineral Water", Description = "Still mineral water, 1.5L bottle", Price = 1.99m, CategoryId = drinksCatId, TaxRateId = vat23Id },
                    new() { SKU = "SKU-2002", EAN = "5901234502027", Name = "Orange Juice", Description = "Fresh squeezed orange juice, 1L", Price = 4.50m, CategoryId = drinksCatId, TaxRateId = vat23Id },
                    new() { SKU = "SKU-2003", EAN = "5901234502034", Name = "Energy Drink", Description = "Energy drink with vitamins, 250ml", Price = 2.99m, CategoryId = drinksCatId, TaxRateId = vat23Id },
                    new() { SKU = "SKU-2004", EAN = "5901234502041", Name = "Coffee Beans", Description = "Premium arabica coffee beans, 500g", Price = 15.99m, CategoryId = drinksCatId, TaxRateId = vat23Id },
                    new() { SKU = "SKU-2005", EAN = "5901234502058", Name = "Sparkling Water", Description = "Carbonated mineral water, 1L", Price = 2.25m, CategoryId = drinksCatId, TaxRateId = vat23Id },
                    new() { SKU = "SKU-2006", EAN = "5901234502065", Name = "Iced Tea", Description = "Lemon flavored iced tea, 500ml", Price = 2.75m, CategoryId = drinksCatId, TaxRateId = vat23Id }
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