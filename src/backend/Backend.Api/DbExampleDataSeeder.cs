using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Enums;
using Backend.Api.Objects.Entities.Models;
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
            SeedWarehouses();
            SeedProducts();
            SeedClients();
            SeedDeliveryCompanies();
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

        // --- WAREHOUSES ---
        private void SeedWarehouses()
        {
            if (_db.Warehouses.Any()) return;

            var a1 = new Address { Country = Country.Poland, City = "Warszawa", Street = "Prosta", Building = "1", PostalCode = "00-000" };
            var a2 = new Address { Country = Country.Poland, City = "Kraków", Street = "Długa", Building = "12", PostalCode = "31-001" };
            _db.Addresses.AddRange(a1, a2);
            _db.SaveChanges();

            _db.Warehouses.AddRange(
                new() { Name = "Main Warehouse", AddressId = a1.Id },
                new() { Name = "Backup Warehouse", AddressId = a2.Id }
            );
            _db.SaveChanges();
        }

        // --- PRODUCTS ---
        private void SeedProducts()
        {
            if (_db.Products.Any()) return;

            var categories = _db.Categories.ToDictionary(c => c.Name, c => c.Id);
            var taxIds = _db.TaxRates.Select(x => x.Id).ToList();
            var warehouseIds = _db.Warehouses.Select(x => x.Id).ToList();

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

                // assign products to both warehouses with some random stock
                foreach (var wid in warehouseIds)
                {
                    _db.WarehouseProducts.Add(new()
                    {
                        WarehouseId = wid,
                        ProductId = product.Id,
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

        // --- DELIVERY COMPANIES ---
        private void SeedDeliveryCompanies()
        {
            if (_db.DeliveryCompanies.Any()) return;

            var a1 = new Address { Country = Country.Poland, City = "Łódź", Street = "Transportowa", Building = "9", PostalCode = "90-001" };
            var a2 = new Address { Country = Country.Poland, City = "Lublin", Street = "Kurierska", Building = "11", PostalCode = "20-101" };
            _db.Addresses.AddRange(a1, a2);
            _db.SaveChanges();

            _db.DeliveryCompanies.AddRange(
                new() { Name = "DPD", Email = "info@dpd.pl", PhoneNumber = "222222333", AddressId = a1.Id },
                new() { Name = "InPost", Email = "contact@inpost.pl", PhoneNumber = "333444555", AddressId = a2.Id }
            );
            _db.SaveChanges();
        }

        // --- SHIPMENTS + PARCELS ---
        private void SeedShipments()
        {
            if (_db.Shipments.Any()) return;

            var companyIds = _db.DeliveryCompanies.Select(x => x.Id).ToList();
            var addresses = _db.Addresses.ToList();
            var products = _db.Products.Take(5).ToList();

            for (int i = 0; i < 3; i++)
            {
                // create shipment - with random addresses and delivery company
                var shipment = new Shipment
                {
                    Type = ShipmentType.Outgoing,
                    Status = (ShipmentStatus)_rand.Next(1, 6),
                    SendDate = DateTimeOffset.UtcNow.AddDays(-_rand.Next(1, 10)),
                    DeliveryCompanyId = companyIds[_rand.Next(companyIds.Count)],
                    AddressSenderId = addresses[_rand.Next(addresses.Count)].Id,
                    AddressReceiverId = addresses[_rand.Next(addresses.Count)].Id
                };
                _db.Shipments.Add(shipment);
                _db.SaveChanges();

                // create parcel with random dimensions
                var parcel = new Parcel
                {
                    Description = $"Parcel for shipment {shipment.Id}",
                    Weight = (decimal)_rand.NextDouble() * 5 + 0.5m,
                    Length = 20 + _rand.Next(30),
                    Width = 15 + _rand.Next(20),
                    Height = 10 + _rand.Next(10),
                    ShipmentId = shipment.Id
                };
                _db.Parcels.Add(parcel);
                _db.SaveChanges();

                // assign some products to the parcel
                _db.Entry(parcel).Reload();
                foreach (var p in products)
                {
                    _db.ParcelProducts.Add(new() { ParcelId = parcel.Id, ProductId = p.Id, Quantity = _rand.Next(1, 5) });
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