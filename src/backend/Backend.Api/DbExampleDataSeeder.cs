using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Enums;
using Backend.Api.Objects.Entities.Models;
using Backend.Api.Objects.Entities.Models.Relations;
using System.Security.Cryptography;
using System.Text;

namespace Backend.Api.Infrastructure
{
    public class DbExampleDataSeeder
    {
        private readonly AppDbContext _db;
        private readonly Random _rand = new();

        public DbExampleDataSeeder(AppDbContext db)
        {
            _db = db;
        }

        public void Seed()
        {
            if (!_db.Database.CanConnect()) return;

            SeedCategories();
            SeedTaxRates();
            SeedLocations();
            SeedProducts();
            SeedClients();
            SeedShipments();
            SeedSalesDocuments();
            SeedUsers();
        }

        // --- CATEGORIES ---
        private void SeedCategories()
        {
            if (_db.Categories.Any()) return;

            string[] names = {
                "Food", "Drinks", "Electronics", "Clothing", "Books",
                "Furniture", "Cosmetics", "Sport", "Tools", "Miscellaneous"
            };

            foreach (var n in names)
                _db.Categories.Add(new Category { Name = n, Description = $"{n} category" });

            _db.SaveChanges();
        }

        // --- TAX RATES ---
        private void SeedTaxRates()
        {
            if (_db.TaxRates.Any()) return;

            _db.TaxRates.AddRange(
                new() { Code = "VAT23", Rate = 0.23m },
                new() { Code = "VAT8", Rate = 0.08m },
                new() { Code = "VAT5", Rate = 0.05m },
                new() { Code = "VAT0", Rate = 0.00m }
            );
            _db.SaveChanges();
        }

        // --- LOCATIONS ---
        private void SeedLocations()
        {
            if (_db.Locations.Any()) return;

            var zones = new[] { "A001", "A002", "A003", "B001", "B002" };
            var columns = new[] { "C001", "C002", "C003", "C004" };
            var shelves = new[] { "S001", "S002", "S003", "S004", "S005" };

            var locations = new List<Location>();
            foreach (var zone in zones)
            {
                foreach (var col in columns)
                {
                    foreach (var shelf in shelves)
                    {
                        locations.Add(new Location
                        {
                            Zone = zone,
                            Col = col,
                            Shelf = shelf,
                            LocationCode = $"{zone}-{col}-{shelf}"
                        });
                    }
                }
            }

            _db.Locations.AddRange(locations);
            _db.SaveChanges();
        }

        // --- PRODUCTS ---
        private void SeedProducts()
        {
            if (_db.Products.Any()) return;

            var categories = _db.Categories.ToDictionary(c => c.Name, c => c.Id);
            var taxIds = _db.TaxRates.Select(x => x.Id).ToList();
            var locationIds = _db.Locations.Select(x => x.Id).ToList();

            var products = new List<(string Cat, string Name, string Desc, decimal Price)>
            {
                // --- FOOD ---
                ("Food", "Bread", "Freshly baked wholegrain bread", 4.20m),
                ("Food", "Butter", "Natural Polish butter 200g", 7.90m),
                ("Food", "Cheese", "Mature cheddar block 250g", 11.50m),

                // --- DRINKS ---
                ("Drinks", "Orange Juice", "100% squeezed orange juice 1L", 5.99m),
                ("Drinks", "Mineral Water", "Still mineral water 1.5L", 2.49m),
                ("Drinks", "Coffee Beans", "Arabica 1kg premium roast", 42.90m),

                // --- ELECTRONICS ---
                ("Electronics", "Wireless Mouse", "2.4GHz ergonomic wireless mouse", 79.99m),
                ("Electronics", "Mechanical Keyboard", "RGB mechanical keyboard (blue switches)", 249.00m),
                ("Electronics", "USB-C Cable", "Fast charging cable 1m", 19.99m),

                // --- CLOTHING ---
                ("Clothing", "Men's T-Shirt", "Cotton slim-fit t-shirt", 39.90m),
                ("Clothing", "Women's Jeans", "Classic blue denim jeans", 119.00m),
                ("Clothing", "Hoodie", "Unisex black hoodie with pocket", 89.00m),

                // --- BOOKS ---
                ("Books", "C# in Depth", "Programming guide by Jon Skeet", 189.00m),
                ("Books", "Clean Code", "A Handbook of Agile Software Craftsmanship", 149.00m),
                ("Books", "Atomic Habits", "Transform your habits and productivity", 69.00m),

                // --- FURNITURE ---
                ("Furniture", "Office Chair", "Ergonomic chair with adjustable armrests", 449.00m),
                ("Furniture", "Standing Desk", "Height adjustable electric desk", 1299.00m),
                ("Furniture", "Bookshelf", "5-tier oak bookshelf 180cm", 299.00m),

                // --- COSMETICS ---
                ("Cosmetics", "Shampoo", "Natural herbal shampoo 400ml", 14.90m),
                ("Cosmetics", "Face Cream", "Moisturizing day cream 50ml", 39.90m),
                ("Cosmetics", "Toothpaste", "Whitening toothpaste 100ml", 9.99m),

                // --- SPORT ---
                ("Sport", "Running Shoes", "Lightweight men's running shoes", 299.00m),
                ("Sport", "Yoga Mat", "Non-slip mat 6mm", 89.00m),
                ("Sport", "Dumbbell Set", "Adjustable dumbbells 20kg", 499.00m),

                // --- TOOLS ---
                ("Tools", "Cordless Drill", "18V Li-ion drill with 2 batteries", 399.00m),
                ("Tools", "Hammer", "Carbon steel hammer 500g", 29.00m),
                ("Tools", "Screwdriver Set", "Precision screwdriver set 24pcs", 79.00m),

                // --- MISCELLANEOUS ---
                ("Miscellaneous", "Gift Card 100 PLN", "Store gift card 100 PLN", 100.00m),
                ("Miscellaneous", "Reusable Bag", "Eco-friendly shopping bag", 5.00m),
                ("Miscellaneous", "Notebook", "A5 lined notebook 100 pages", 8.90m)
            };

            // add products
            int i = 1;
            foreach (var (cat, name, desc, price) in products)
            {
                var product = new Product
                {
                    SKU = $"SKU-{i:D4}",
                    Name = name,
                    Description = desc,
                    Price = price,
                    CategoryId = categories[cat],
                    TaxRateId = taxIds[_rand.Next(taxIds.Count)],
                    IsActive = true
                };
                _db.Products.Add(product);
                _db.SaveChanges();

                // assign products to random locations with random quantities
                // each product will be stored in 1-3 random locations
                var numLocations = _rand.Next(1, 4);
                var selectedLocations = locationIds.OrderBy(x => _rand.Next()).Take(numLocations);

                foreach (var locId in selectedLocations)
                {
                    _db.ProductsInWarehouse.Add(new()
                    {
                        ProductId = product.Id,
                        LocationId = locId,
                        Quantity = _rand.Next(10, 200)
                    });
                }

                i++;
            }

            _db.SaveChanges();
        }

        // --- CLIENTS ---
        private void SeedClients()
        {
            if (_db.Clients.Any()) return;

            var addrs = new List<Address>
            {
                new() { Country = Country.Poland, City = "Gdańsk", Street = "Morska", Building = "5", PostalCode = "80-001" },
                new() { Country = Country.Poland, City = "Poznań", Street = "Rynkowa", Building = "10", PostalCode = "60-101" },
                new() { Country = Country.Poland, City = "Wrocław", Street = "Nowa", Building = "7", PostalCode = "50-001" },
                new() { Country = Country.Poland, City = "Warszawa", Street = "Handlowa", Building = "21", PostalCode = "00-201" },
                new() { Country = Country.Poland, City = "Kraków", Street = "Fabryczna", Building = "3", PostalCode = "31-101" },
            };
            _db.Addresses.AddRange(addrs);
            _db.SaveChanges();

            _db.Clients.AddRange(
                new() { Name = "Jan Kowalski", Type = ClientType.Person, Email = "jan.kowalski@example.com", PhoneNumber = "600111222", AddressId = addrs[0].Id },
                new() { Name = "Anna Nowak", Type = ClientType.Person, Email = "anna.nowak@example.com", PhoneNumber = "600333444", AddressId = addrs[1].Id },
                new() { Name = "Piotr Zieliński", Type = ClientType.Person, Email = "piotr.z@example.com", PhoneNumber = "600555666", AddressId = addrs[2].Id },
                new() { Name = "TechCorp Sp. z o.o.", Type = ClientType.Company, TaxId = "PL1234567890", Email = "biuro@techcorp.pl", PhoneNumber = "222333444", AddressId = addrs[3].Id },
                new() { Name = "MegaTrade S.A.", Type = ClientType.Company, TaxId = "PL0987654321", Email = "info@megatrade.pl", PhoneNumber = "222555666", AddressId = addrs[4].Id }
            );
            _db.SaveChanges();
        }

        // --- SHIPMENTS ---
        private void SeedShipments()
        {
            if (_db.Shipments.Any()) return;

            var addresses = _db.Addresses.ToList();
            var products = _db.Products.Take(5).ToList();

            for (int i = 0; i < 3; i++)
            {
                var senderAddr = addresses[_rand.Next(addresses.Count)];
                var receiverAddr = addresses[_rand.Next(addresses.Count)];

                // create shipment with dimensions directly on shipment
                // Status: 1=InPreparation, 2=ReadyToCollect, 3=Collected, 4=InTransit, 5=Delivered
                var status = (ShipmentStatus)_rand.Next(1, 6);
                var shipment = new Shipment
                {
                    Type = ShipmentType.Outgoing,
                    Status = status,
                    // Set dates based on status (Collected+ needs SendDate, Delivered needs DeliveryDate)
                    SendDate = status >= ShipmentStatus.Collected ? DateTimeOffset.UtcNow.AddDays(-_rand.Next(1, 10)) : null,
                    DeliveryDate = status == ShipmentStatus.Delivered ? DateTimeOffset.UtcNow.AddDays(-_rand.Next(0, 5)) : null,

                    // Parcel fields (dimensions)
                    Description = $"Package #{i + 1} containing electronic goods",
                    Weight = (decimal)(_rand.NextDouble() * 5 + 0.5),
                    Length = 20 + _rand.Next(30),
                    Width = 15 + _rand.Next(20),
                    Height = 10 + _rand.Next(10),

                    // Sender information
                    SenderName = "Company Warehouse",
                    SenderTaxId = "PL1234567890",
                    SenderAddressId = senderAddr.Id,
                    SenderDetails = "Main distribution center",

                    // Receiver information
                    ReceiverName = i % 2 == 0 ? "Jan Kowalski" : "Anna Nowak",
                    ReceiverTaxId = null,
                    ReceiverAddressId = receiverAddr.Id,
                    ReceiverDetails = "Please call before delivery"
                };
                _db.Shipments.Add(shipment);
                _db.SaveChanges();

                // assign some products directly to the shipment via ShipmentProduct
                foreach (var p in products.Take(_rand.Next(2, 5)))
                {
                    _db.ShipmentProducts.Add(new ShipmentProduct
                    {
                        ShipmentId = shipment.Id,
                        ProductId = p.Id,
                        Quantity = _rand.Next(1, 5)
                    });
                }
                _db.SaveChanges();
            }
        }

        // --- SALES DOCUMENTS + ITEMS + PAYMENTS ---
        private void SeedSalesDocuments()
        {
            if (_db.SalesDocuments.Any()) return;

            var clients = _db.Clients.Take(3).ToList();
            var products = _db.Products.Take(5).ToList();
            var tax = _db.TaxRates.First();

            for (int i = 1; i <= 3; i++)
            {
                // create sales document
                var doc = new SalesDocument
                {
                    DocumentType = i == 1 ? SalesDocumentType.Receipt : SalesDocumentType.InvoiceCompany,
                    IssueDate = DateTimeOffset.UtcNow.AddDays(-i),
                    Description = $"Example document {i}",
                    DocumentNumber = $"DOC/{i:D3}/2025",
                    ClientId = clients[_rand.Next(clients.Count)].Id,
                };

                decimal totalNet = 0, totalTax = 0, totalGross = 0;

                _db.SalesDocuments.Add(doc);
                _db.SaveChanges();

                // create document items
                foreach (var p in products)
                {
                    // random quantity
                    var qty = _rand.Next(1, 3);
                    // calculate line values
                    var lineNet = p.Price * qty;
                    var lineTax = Math.Round(lineNet * 0.23m, 2);
                    var lineGross = lineNet + lineTax;

                    // create item
                    _db.SalesDocumentItems.Add(new()
                    {
                        SalesDocumentId = doc.Id,
                        ProductId = p.Id,
                        TaxRateId = tax.Id,
                        ProductName = p.Name,
                        ProductSKU = p.SKU,
                        Quantity = qty,
                        UnitPriceNet = p.Price,
                        LineNet = lineNet,
                        LineTax = lineTax,
                        LineGross = lineGross
                    });

                    totalNet += lineNet;
                    totalTax += lineTax;
                    totalGross += lineGross;
                }

                doc.TotalNet = totalNet;
                doc.TotalTax = totalTax;
                doc.TotalGross = totalGross;
                _db.SaveChanges();

                // create payment
                _db.SalesPayments.Add(new()
                {
                    SalesDocumentId = doc.Id,
                    Amount = totalGross,
                    PaymentOption = (PaymentOption)_rand.Next(1, 5)
                });
                _db.SaveChanges();
            }
        }

        // --- USERS ---
        private void SeedUsers()
        {
            if (_db.Users.Any()) return;

            // create users for all roles except Unspecified
            foreach (UserRole role in Enum.GetValues(typeof(UserRole)))
            {
                if (role == UserRole.Unspecified) continue;

                // generate login and password (hash)
                var login = role.ToString().ToLower();
                var password = $"{role}123!";

                CreatePasswordHash(password, out var hash, out var salt);

                // create user
                var u = new User
                {
                    FirstName = role.ToString(),
                    LastName = "User",
                    Email = $"{login}@system.local",
                    PhoneNumber = $"600{_rand.Next(100000, 999999)}",
                    DateOfBirth = new DateTime(1990, 1, 1).AddDays(_rand.Next(1000)),
                    Role = role,
                    Address = new Address
                    {
                        Country = Country.Poland,
                        City = "Warszawa",
                        Street = "User Street",
                        Building = _rand.Next(1, 20).ToString(),
                        PostalCode = "00-000"
                    },
                    Credentials = new UserCredential
                    {
                        Login = login,
                        PasswordHash = Convert.ToBase64String(hash),
                        PasswordSalt = Convert.ToBase64String(salt),
                        IsActive = true
                    }
                };
                _db.Users.Add(u);
                _db.SaveChanges();

                Console.WriteLine($"Created user: {login} / {password}");
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