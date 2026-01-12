using Backend.Api.Objects.Entities.Models.Relations;
using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using BackendTest.TestHelpers;
using FluentAssertions;
using Moq;
using System.Threading.Tasks;
using Xunit;
using Backend.Api.Objects.Entities.Enums;

namespace BackendTest.Services
{
    public class SalesDocumentServiceTests : IClassFixture<DatabaseFixture>
    {
        private readonly DatabaseFixture _fixture;
        private readonly IInventoryChangeService _inventoryChangeService;

        public SalesDocumentServiceTests(DatabaseFixture fixture)
        {
            _fixture = fixture;
            _inventoryChangeService = new Mock<IInventoryChangeService>().Object;
        }

        private SalesDocumentService CreateService(AppDbContext context)
        {
            return new SalesDocumentService(context, _inventoryChangeService);
        }

        #region Sales Tests

        [Fact]
        public async Task MakeSale_InvoiceType_NoClientSelected_Error()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);

            var dto = TestDataBuilder.POSFinalization()
                .WithDocumentType(SalesDocumentType.InvoiceCompany)
                .AddItem(1, "Test Product", "TP001", 1, 10, 1)
                .AddPayment(PaymentOption.Cash, 10, 10)
                .Build();

            // Act & Assert
            var ex = await Assert.ThrowsAsync<System.ArgumentException>(() => service.FinalizePOSTransactionAsync(dto, 1));
            ex.Message.Should().Contain("ClientId is required for invoices.");
        }

        [Fact]
        public async Task MakeSale_InvoiceType_ClientSelected_Success()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);
            var address = new Address { Street = "Test Street 15", City = "Test City", PostalCode = "12345", Country = Country.Poland, Building = "1", Premises = "1" };
            context.Addresses.Add(address);
            var client = new Client { Name = "Test Client", Email = "client@test.com", Address = address, PhoneNumber = "123456789", Type = ClientType.Company };
            context.Clients.Add(client);
            var category = new Category { Name = "Test Category Invoice", Description = "Test category" };
            context.Categories.Add(category);
            var taxRate = new TaxRate { Rate = 0.23m, Code = "VAT31" };
            context.TaxRates.Add(taxRate);
            var product = new Product {Id=2, Name = "Test Product", Description = "Test product description", SKU = "TP009", Price = 10, TaxRate = taxRate, Category = category };
            context.Products.Add(product);
            var location = new Location { Id=2, Zone = "F", Col = "6", Shelf = "6", LocationCode = "F-6-6" };
            context.Locations.Add(location);
            var warehouseEntry = new ProductsInWarehouse { Product = product, Location = location, Quantity = 10 };
            context.ProductsInWarehouse.Add(warehouseEntry);
            await context.SaveChangesAsync();

            var dto = TestDataBuilder.POSFinalization()
                .WithDocumentType(SalesDocumentType.InvoiceCompany)
                .WithClient(client.Id)
                .AddItem(product.Id, "Test Product", "TP009", 1, 12.3m, taxRate.Id, location.Id)
                .AddPayment(PaymentOption.Cash, 12.3m, 12.3m)
                .Build();

            // Act
            var result = await service.FinalizePOSTransactionAsync(dto, 1);

            // Assert
            result.Should().NotBeNull();
            var doc = await context.SalesDocuments.FindAsync(result.SalesDocumentId);
            doc.Should().NotBeNull();
            doc.ClientId.Should().Be(client.Id);
        }

        [Fact]
        public async Task MakeSale_Receipt_NotFullyPaid_Error()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);
            var category = new Category { Name = "Test Category Receipt Underpay", Description = "Test category" };
            context.Categories.Add(category);
            var taxRate = new TaxRate { Rate = 0.23m, Code = "VAT32" };
            context.TaxRates.Add(taxRate);
            var product = new Product {Id=3, Name = "Test Product", Description = "Test product description", SKU = "TP010", Price = 10, TaxRate = taxRate, Category = category };
            context.Products.Add(product);
            var location = new Location { Id=3, Zone = "G", Col = "7", Shelf = "7", LocationCode = "G-7-7" };
            context.Locations.Add(location);
            var warehouseEntry = new ProductsInWarehouse { Product = product, Location = location, Quantity = 10 };
            context.ProductsInWarehouse.Add(warehouseEntry);
            await context.SaveChangesAsync();

            var dto = TestDataBuilder.POSFinalization()
                .AddItem(product.Id, "Test Product", "TP010", 1, 12.3m, taxRate.Id, location.Id)
                .AddPayment(PaymentOption.Cash, 10, 10)
                .Build();

            // Act & Assert
            var ex = await Assert.ThrowsAsync<System.InvalidOperationException>(() => service.FinalizePOSTransactionAsync(dto, 1));
            ex.Message.Should().Contain("Insufficient payment.");
        }

        [Fact]
        public async Task MakeSale_Receipt_FullyPaid_Success()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);
            var category = new Category { Name = "Test Category Receipt Paid", Description = "Test category" };
            context.Categories.Add(category);
            var taxRate = new TaxRate { Rate = 0.23m, Code = "VAT33" };
            context.TaxRates.Add(taxRate);
            var product = new Product {Id=4, Name = "Test Product", Description = "Test product description", SKU = "TP011", Price = 10, TaxRate = taxRate, Category = category };
            context.Products.Add(product);
            var location = new Location { Id=4, Zone = "H", Col = "8", Shelf = "8", LocationCode = "H-8-8" };
            context.Locations.Add(location);
            var warehouseEntry = new ProductsInWarehouse { Product = product, Location = location, Quantity = 10 };
            context.ProductsInWarehouse.Add(warehouseEntry);
            await context.SaveChangesAsync();

            var dto = TestDataBuilder.POSFinalization()
                .AddItem(product.Id, "Test Product", "TP011", 1, 12.3m, taxRate.Id, location.Id)
                .AddPayment(PaymentOption.Cash, 12.3m, 12.3m)
                .Build();

            // Act
            var result = await service.FinalizePOSTransactionAsync(dto, 1);

            // Assert
            result.Should().NotBeNull();
        }

        #endregion

        #region Returns Tests

        [Fact]
        public async Task MakeReturn_OfGiftCard_Error()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);

            var category = new Category { Name = "Test Category GiftCard", Description = "Test category" };
            context.Categories.Add(category);
            var taxRate = new TaxRate { Rate = 0.23m, Code = "VAT34" };
            context.TaxRates.Add(taxRate);
            var product = new Product { Id = 5, Name = "Gift Card", Description = "Digital gift card", SKU = "_gc", Price = 50, TaxRate = taxRate, Category = category };
            context.Products.Add(product);
            var location = new Location { Id = 5, Zone = "I", Col = "9", Shelf = "9", LocationCode = "I-9-9" };
            context.Locations.Add(location);

            var originalDoc = new SalesDocument
            {
                DocumentNumber = "TEST/1/2024",
                Items = new List<SalesDocumentItem>
                {
                    new SalesDocumentItem
                    {
                        Id = 1,
                        ProductId = product.Id,
                        Quantity = 1,
                        ProductSKU = "_gc",
                        ProductName = "Gift Card",
                        TaxRate = taxRate,
                        TaxRateId = taxRate.Id,
                        UnitGross = 50
                    }
                }
            };
            context.SalesDocuments.Add(originalDoc);
            await context.SaveChangesAsync();
            
            var dto = TestDataBuilder.POSReturn()
                .WithOriginalDocument("TEST/1/2024")
                .AddReturnItem(1, 5, "Gift Card", "_gc", 1, 50, taxRate.Id)
                .AddLocationToLastItem(location.Id, 1)
                .Build();

            // Act & Assert
            var ex = await Assert.ThrowsAsync<System.InvalidOperationException>(() => service.ProcessReturnAsync(dto, 1));
            ex.Message.Should().Be("Gift cards cannot be returned. Digital products are non-returnable.");
        }

        [Fact]
        public async Task MakeReturn_NoProductsSelected_Error()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);

            var dto = TestDataBuilder.POSReturn()
                .WithOriginalDocument("anydoc")
                .Build();

            // Act & Assert
            var ex = await Assert.ThrowsAsync<System.ArgumentException>(() => service.ProcessReturnAsync(dto, 1));
            ex.Message.Should().Contain("Return must contain at least one item.");
        }

        #endregion
    }
}
