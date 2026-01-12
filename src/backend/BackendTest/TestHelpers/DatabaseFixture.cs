using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Enums;
using Backend.Api.Objects.Entities.Models;
using Backend.Api.Objects.Entities.Models.Relations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace BackendTest.TestHelpers
{
    /// <summary>
    /// Provides an in-memory database fixture for testing.
    /// Creates a fresh database context for each test to ensure isolation.
    /// </summary>
    public class DatabaseFixture : IDisposable
    {
        private bool _disposed;

        public AppDbContext CreateContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString()) // Unique DB per test
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            var context = new AppDbContext(options);
            context.Database.EnsureCreated();

            return context;
        }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        protected virtual void Dispose(bool disposing)
        {
            if (!_disposed)
            {
                if (disposing)
                {
                    // Cleanup if needed
                }
                _disposed = true;
            }
        }
    }

    /// <summary>
    /// Helper methods for seeding test data
    /// </summary>
    public static class TestDataSeeder
    {
        public static User CreateTestUser(AppDbContext context, UserRole role = UserRole.ShopAssistant)
        {
            var address = new Address
            {
                Country = Country.Poland,
                City = "Warsaw",
                PostalCode = "00-000",
                Street = "Test Street"
            };
            context.Addresses.Add(address);
            context.SaveChanges();

            var user = new User
            {
                FirstName = "Test",
                LastName = "User",
                Email = $"test.user.{Guid.NewGuid()}@example.com",
                PhoneNumber = "123456789",
                DateOfBirth = DateTime.Now.AddYears(-30),
                Role = role,
                AddressId = address.Id
            };

            context.Users.Add(user);
            context.SaveChanges();
            return user;
        }

        public static TaxRate CreateTestTaxRate(AppDbContext context, string code = "A", decimal rate = 0.23m)
        {
            var taxRate = new TaxRate
            {
                Code = code,
                Rate = rate,
                IsActive = true
            };

            context.TaxRates.Add(taxRate);
            context.SaveChanges();
            return taxRate;
        }

        public static Product CreateTestProduct(AppDbContext context, int taxRateId, decimal price = 100m, string sku = "TEST-SKU")
        {
            var product = new Product
            {
                SKU = sku,
                EAN = $"EAN-{Guid.NewGuid().ToString().Substring(0, 8)}",
                Name = $"Test Product {sku}",
                Description = "Test product description",
                Price = price,
                TaxRateId = taxRateId,
                IsActive = true
            };

            context.Products.Add(product);
            context.SaveChanges();
            return product;
        }

        public static Location CreateTestLocation(AppDbContext context, string code = "A-01-01")
        {
            var location = new Location
            {
                LocationCode = code,
                Zone = code.Split('-')[0],
                Col = code.Split('-')[1],
                Shelf = code.Split('-')[2],
                IsActive = true
            };

            context.Locations.Add(location);
            context.SaveChanges();
            return location;
        }

        public static void AddProductToWarehouse(AppDbContext context, int productId, int locationId, int quantity)
        {
            var productsInWarehouse = new ProductsInWarehouse
            {
                ProductId = productId,
                LocationId = locationId,
                Quantity = quantity
            };

            context.ProductsInWarehouse.Add(productsInWarehouse);
            context.SaveChanges();
        }

        public static Client CreateTestClient(AppDbContext context, ClientType type = ClientType.Person)
        {
            var address = new Address
            {
                Country = Country.Poland,
                City = "Warsaw",
                PostalCode = "00-000",
                Street = "Test Street"
            };
            context.Addresses.Add(address);
            context.SaveChanges();

            var client = new Client
            {
                Name = type == ClientType.Person ? "Test Client" : "Test Company Ltd",
                Email = $"test.client.{Guid.NewGuid()}@example.com",
                PhoneNumber = "987654321",
                Type = type,
                AddressId = address.Id,
                IsActive = true
            };

            if (type == ClientType.Company)
            {
                client.TaxId = "1234567890";
            }

            context.Clients.Add(client);
            context.SaveChanges();
            return client;
        }

        public static GiftCard CreateTestGiftCard(AppDbContext context, decimal value = 50m, bool isActive = true)
        {
            var giftCard = new GiftCard
            {
                Code = $"GC-{Guid.NewGuid().ToString().Substring(0, 8)}",
                Value = value,
                DateIssued = DateTimeOffset.Now,
                DateValidUntil = DateTimeOffset.Now.AddYears(1),
                IsActive = isActive
            };

            context.GiftCards.Add(giftCard);
            context.SaveChanges();
            return giftCard;
        }

        public static Address CreateTestAddress(AppDbContext context, Country country = Country.Poland)
        {
            var address = new Address
            {
                Country = country,
                City = "Warsaw",
                PostalCode = "00-000",
                Street = "Test Street",
                Building = "10A"
            };

            context.Addresses.Add(address);
            context.SaveChanges();
            return address;
        }

        public static Event CreateTestEvent(AppDbContext context, int addressId, int userId, byte[]? image = null, EventStatus status = EventStatus.Created)
        {
            var eventEntity = new Event
            {
                Title = $"Test Event {Guid.NewGuid().ToString().Substring(0, 8)}",
                Description = "This is a test event description for testing purposes.",
                DateOfEvent = DateTime.UtcNow.AddDays(30),
                Status = status,
                Image = image,
                AddressId = addressId,
                CreatedByUserId = userId,
                DateOfPublish = status == EventStatus.Published ? DateTime.UtcNow : null
            };

            context.Events.Add(eventEntity);
            context.SaveChanges();
            return eventEntity;
        }
    }
}
