using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities.Enums;
using Backend.Api.Objects.Entities.Models.Relations;
using BackendTest.TestHelpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace BackendTest.Services
{
    /// <summary>
    /// Tests for ProductsInWarehouse service: add, remove, transfer, and lookups.
    /// Location CRUD/activation tests live in LocationServiceTests.
    /// </summary>
    public class StorageServiceTests : IClassFixture<DatabaseFixture>
    {
        private readonly DatabaseFixture _fixture;

        public StorageServiceTests(DatabaseFixture fixture)
        {
            _fixture = fixture;
        }

        #region Add Product Tests

        [Fact]
        public async Task AddProduct_WithValidData_Success()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var mockInventoryService = new Mock<IInventoryChangeService>();
            var service = new ProductsInWarehouseService(context, mockInventoryService.Object);

            var user = TestDataSeeder.CreateTestUser(context);
            var taxRate = TestDataSeeder.CreateTestTaxRate(context);
            var product = TestDataSeeder.CreateTestProduct(context, taxRate.Id);
            var location = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");

            // Act
            var result = await service.AddProductToLocationAsync(product.Id, location.Id, 50, user.Id);

            // Assert
            result.Should().BeTrue();

            var inventory = await context.ProductsInWarehouse
                .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.LocationId == location.Id);
            inventory.Should().NotBeNull();
            inventory!.Quantity.Should().Be(50);

            // Verify inventory change was logged
            mockInventoryService.Verify(s => s.LogInventoryChangeAsync(
                InventoryChangeType.Add,
                product.Id,
                50,
                null,
                location.Id,
                user.Id,
                It.IsAny<CancellationToken>()
            ), Times.Once);
        }

        [Fact]
        public async Task AddProduct_ProductNotFound_ThrowsException()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var mockInventoryService = new Mock<IInventoryChangeService>();
            var service = new ProductsInWarehouseService(context, mockInventoryService.Object);

            var user = TestDataSeeder.CreateTestUser(context);
            var location = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");

            // Act & Assert
            var exception = await Assert.ThrowsAsync<ArgumentException>(() =>
                service.AddProductToLocationAsync(99999, location.Id, 10, user.Id));
            exception.Message.Should().Contain("Product with ID 99999 not found");
        }

        [Fact]
        public async Task AddProduct_LocationNotFound_ThrowsException()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var mockInventoryService = new Mock<IInventoryChangeService>();
            var service = new ProductsInWarehouseService(context, mockInventoryService.Object);

            var user = TestDataSeeder.CreateTestUser(context);
            var taxRate = TestDataSeeder.CreateTestTaxRate(context);
            var product = TestDataSeeder.CreateTestProduct(context, taxRate.Id);

            // Act & Assert
            var exception = await Assert.ThrowsAsync<ArgumentException>(() =>
                service.AddProductToLocationAsync(product.Id, 99999, 10, user.Id));
            exception.Message.Should().Contain("Location with ID 99999 not found");
        }

        [Fact]
        public async Task AddProduct_ToExistingLocation_IncrementsQuantity()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var mockInventoryService = new Mock<IInventoryChangeService>();
            var service = new ProductsInWarehouseService(context, mockInventoryService.Object);

            var user = TestDataSeeder.CreateTestUser(context);
            var taxRate = TestDataSeeder.CreateTestTaxRate(context);
            var product = TestDataSeeder.CreateTestProduct(context, taxRate.Id);
            var location = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");

            // Add initial quantity
            await service.AddProductToLocationAsync(product.Id, location.Id, 30, user.Id);

            // Act - Add more to the same location
            await service.AddProductToLocationAsync(product.Id, location.Id, 20, user.Id);

            // Assert
            var inventory = await context.ProductsInWarehouse
                .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.LocationId == location.Id);
            inventory.Should().NotBeNull();
            inventory!.Quantity.Should().Be(50); // 30 + 20
        }

        #endregion

        #region Remove Product Tests

        [Fact]
        public async Task RemoveProduct_WithValidData_Success()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var mockInventoryService = new Mock<IInventoryChangeService>();
            var service = new ProductsInWarehouseService(context, mockInventoryService.Object);

            var user = TestDataSeeder.CreateTestUser(context);
            var taxRate = TestDataSeeder.CreateTestTaxRate(context);
            var product = TestDataSeeder.CreateTestProduct(context, taxRate.Id);
            var location = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");
            TestDataSeeder.AddProductToWarehouse(context, product.Id, location.Id, 100);

            // Act
            var result = await service.RemoveProductFromLocationAsync(product.Id, location.Id, 30, user.Id);

            // Assert
            result.Should().BeTrue();

            var inventory = await context.ProductsInWarehouse
                .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.LocationId == location.Id);
            inventory.Should().NotBeNull();
            inventory!.Quantity.Should().Be(70); // 100 - 30

            // Verify inventory change was logged (negative quantity for removal)
            mockInventoryService.Verify(s => s.LogInventoryChangeAsync(
                InventoryChangeType.Remove,
                product.Id,
                -30,
                location.Id,
                null,
                user.Id,
                It.IsAny<CancellationToken>()
            ), Times.Once);
        }

        [Fact]
        public async Task RemoveProduct_ProductNotInLocation_ThrowsException()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var mockInventoryService = new Mock<IInventoryChangeService>();
            var service = new ProductsInWarehouseService(context, mockInventoryService.Object);

            var user = TestDataSeeder.CreateTestUser(context);
            var taxRate = TestDataSeeder.CreateTestTaxRate(context);
            var product = TestDataSeeder.CreateTestProduct(context, taxRate.Id);
            var location = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");

            // Act & Assert
            var exception = await Assert.ThrowsAsync<ArgumentException>(() =>
                service.RemoveProductFromLocationAsync(product.Id, location.Id, 10, user.Id));
            exception.Message.Should().Contain($"Product {product.Id} not found at location {location.Id}");
        }

        [Fact]
        public async Task RemoveProduct_QuantityExceedsStock_ThrowsException()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var mockInventoryService = new Mock<IInventoryChangeService>();
            var service = new ProductsInWarehouseService(context, mockInventoryService.Object);

            var user = TestDataSeeder.CreateTestUser(context);
            var taxRate = TestDataSeeder.CreateTestTaxRate(context);
            var product = TestDataSeeder.CreateTestProduct(context, taxRate.Id);
            var location = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");
            TestDataSeeder.AddProductToWarehouse(context, product.Id, location.Id, 50);

            // Act & Assert
            var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                service.RemoveProductFromLocationAsync(product.Id, location.Id, 75, user.Id));
            exception.Message.Should().Contain("Cannot remove 75 items");
            exception.Message.Should().Contain("Only 50 available");
        }

        [Fact]
        public async Task RemoveProduct_AllQuantity_RemovesEntry()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var mockInventoryService = new Mock<IInventoryChangeService>();
            var service = new ProductsInWarehouseService(context, mockInventoryService.Object);

            var user = TestDataSeeder.CreateTestUser(context);
            var taxRate = TestDataSeeder.CreateTestTaxRate(context);
            var product = TestDataSeeder.CreateTestProduct(context, taxRate.Id);
            var location = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");
            TestDataSeeder.AddProductToWarehouse(context, product.Id, location.Id, 50);

            // Act
            var result = await service.RemoveProductFromLocationAsync(product.Id, location.Id, 50, user.Id);

            // Assert
            result.Should().BeTrue();

            var inventory = await context.ProductsInWarehouse
                .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.LocationId == location.Id);
            inventory.Should().BeNull(); // Entry removed entirely
        }

        [Fact]
        public async Task RemoveProduct_QuantityZeroOrLower_ThrowsException()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var mockInventoryService = new Mock<IInventoryChangeService>();
            var service = new ProductsInWarehouseService(context, mockInventoryService.Object);

            var user = TestDataSeeder.CreateTestUser(context);
            var taxRate = TestDataSeeder.CreateTestTaxRate(context);
            var product = TestDataSeeder.CreateTestProduct(context, taxRate.Id);
            var location = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");
            TestDataSeeder.AddProductToWarehouse(context, product.Id, location.Id, 50);

            // Act & Assert
            var exception = await Assert.ThrowsAsync<ArgumentException>(() =>
                service.RemoveProductFromLocationAsync(product.Id, location.Id, 0, user.Id));
            exception.Message.Should().Contain("Quantity to remove must be positive.");
        }

        #endregion

        #region Move/Transfer Product Tests

        [Fact]
        public async Task TransferProduct_QuantityZeroOrLower_ThrowsException()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var mockInventoryService = new Mock<IInventoryChangeService>();
            var service = new ProductsInWarehouseService(context, mockInventoryService.Object);

            var user = TestDataSeeder.CreateTestUser(context);
            var taxRate = TestDataSeeder.CreateTestTaxRate(context);
            var product = TestDataSeeder.CreateTestProduct(context, taxRate.Id);
            var fromLocation = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");
            var toLocation = TestDataSeeder.CreateTestLocation(context, "BBBB-0002-0202");
            TestDataSeeder.AddProductToWarehouse(context, product.Id, fromLocation.Id, 50);

            // Act & Assert
            var exception = await Assert.ThrowsAsync<ArgumentException>(() =>
                service.TransferProductAsync(product.Id, fromLocation.Id, toLocation.Id, 0, user.Id));
            exception.Message.Should().Contain("Quantity to transfer must be positive.");
        }
        
        [Fact]
        public async Task TransferProduct_WithValidData_Success()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var mockInventoryService = new Mock<IInventoryChangeService>();
            var service = new ProductsInWarehouseService(context, mockInventoryService.Object);

            var user = TestDataSeeder.CreateTestUser(context);
            var taxRate = TestDataSeeder.CreateTestTaxRate(context);
            var product = TestDataSeeder.CreateTestProduct(context, taxRate.Id);
            var fromLocation = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");
            var toLocation = TestDataSeeder.CreateTestLocation(context, "BBBB-0002-0202");
            TestDataSeeder.AddProductToWarehouse(context, product.Id, fromLocation.Id, 100);

            // Act
            var result = await service.TransferProductAsync(product.Id, fromLocation.Id, toLocation.Id, 40, user.Id);

            // Assert
            result.Should().BeTrue();

            var fromInventory = await context.ProductsInWarehouse
                .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.LocationId == fromLocation.Id);
            fromInventory.Should().NotBeNull();
            fromInventory!.Quantity.Should().Be(60); // 100 - 40

            var toInventory = await context.ProductsInWarehouse
                .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.LocationId == toLocation.Id);
            toInventory.Should().NotBeNull();
            toInventory!.Quantity.Should().Be(40);

            // Verify inventory change was logged
            mockInventoryService.Verify(s => s.LogInventoryChangeAsync(
                InventoryChangeType.Move,
                product.Id,
                40,
                fromLocation.Id,
                toLocation.Id,
                user.Id,
                It.IsAny<CancellationToken>()
            ), Times.Once);
        }

        [Fact]
        public async Task TransferProduct_ProductNotFound_ThrowsException()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var mockInventoryService = new Mock<IInventoryChangeService>();
            var service = new ProductsInWarehouseService(context, mockInventoryService.Object);

            var user = TestDataSeeder.CreateTestUser(context);
            var fromLocation = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");
            var toLocation = TestDataSeeder.CreateTestLocation(context, "BBBB-0002-0202");

            // Act & Assert
            var exception = await Assert.ThrowsAsync<ArgumentException>(() =>
                service.TransferProductAsync(99999, fromLocation.Id, toLocation.Id, 10, user.Id));
            exception.Message.Should().Contain("Product with ID 99999 not found");
        }

        [Fact]
        public async Task TransferProduct_FromLocationNotFound_ThrowsException()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var mockInventoryService = new Mock<IInventoryChangeService>();
            var service = new ProductsInWarehouseService(context, mockInventoryService.Object);

            var user = TestDataSeeder.CreateTestUser(context);
            var taxRate = TestDataSeeder.CreateTestTaxRate(context);
            var product = TestDataSeeder.CreateTestProduct(context, taxRate.Id);
            var toLocation = TestDataSeeder.CreateTestLocation(context, "BBBB-0002-0202");

            // Act & Assert
            var exception = await Assert.ThrowsAsync<ArgumentException>(() =>
                service.TransferProductAsync(product.Id, 99999, toLocation.Id, 10, user.Id));
            exception.Message.Should().Contain("From location with ID 99999 not found");
        }

        [Fact]
        public async Task TransferProduct_ToLocationNotFound_ThrowsException()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var mockInventoryService = new Mock<IInventoryChangeService>();
            var service = new ProductsInWarehouseService(context, mockInventoryService.Object);

            var user = TestDataSeeder.CreateTestUser(context);
            var taxRate = TestDataSeeder.CreateTestTaxRate(context);
            var product = TestDataSeeder.CreateTestProduct(context, taxRate.Id);
            var fromLocation = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");
            TestDataSeeder.AddProductToWarehouse(context, product.Id, fromLocation.Id, 100);

            // Act & Assert
            var exception = await Assert.ThrowsAsync<ArgumentException>(() =>
                service.TransferProductAsync(product.Id, fromLocation.Id, 99999, 10, user.Id));
            exception.Message.Should().Contain("To location with ID 99999 not found");
        }

        [Fact]
        public async Task TransferProduct_SameFromAndTo_ThrowsException()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var mockInventoryService = new Mock<IInventoryChangeService>();
            var service = new ProductsInWarehouseService(context, mockInventoryService.Object);

            var user = TestDataSeeder.CreateTestUser(context);
            var taxRate = TestDataSeeder.CreateTestTaxRate(context);
            var product = TestDataSeeder.CreateTestProduct(context, taxRate.Id);
            var location = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");
            TestDataSeeder.AddProductToWarehouse(context, product.Id, location.Id, 100);

            // Act & Assert
            var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                service.TransferProductAsync(product.Id, location.Id, location.Id, 10, user.Id));
            exception.Message.Should().Contain("Source and destination locations must be different");
        }

        [Fact]
        public async Task TransferProduct_ProductNotInFromLocation_ThrowsException()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var mockInventoryService = new Mock<IInventoryChangeService>();
            var service = new ProductsInWarehouseService(context, mockInventoryService.Object);

            var user = TestDataSeeder.CreateTestUser(context);
            var taxRate = TestDataSeeder.CreateTestTaxRate(context);
            var product = TestDataSeeder.CreateTestProduct(context, taxRate.Id);
            var fromLocation = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");
            var toLocation = TestDataSeeder.CreateTestLocation(context, "BBBB-0002-0202");

            // Act & Assert
            var exception = await Assert.ThrowsAsync<ArgumentException>(() =>
                service.TransferProductAsync(product.Id, fromLocation.Id, toLocation.Id, 10, user.Id));
            exception.Message.Should().Contain($"Product {product.Id} not found at location {fromLocation.Id}");
        }

        [Fact]
        public async Task TransferProduct_QuantityExceedsFromStock_ThrowsException()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var mockInventoryService = new Mock<IInventoryChangeService>();
            var service = new ProductsInWarehouseService(context, mockInventoryService.Object);

            var user = TestDataSeeder.CreateTestUser(context);
            var taxRate = TestDataSeeder.CreateTestTaxRate(context);
            var product = TestDataSeeder.CreateTestProduct(context, taxRate.Id);
            var fromLocation = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");
            var toLocation = TestDataSeeder.CreateTestLocation(context, "BBBB-0002-0202");
            TestDataSeeder.AddProductToWarehouse(context, product.Id, fromLocation.Id, 50);

            // Act & Assert
            var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                service.TransferProductAsync(product.Id, fromLocation.Id, toLocation.Id, 75, user.Id));
            exception.Message.Should().Contain("Cannot transfer 75 items");
            exception.Message.Should().Contain("Only 50 available");
        }

        [Fact]
        public async Task TransferProduct_AllQuantity_RemovesFromEntry()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var mockInventoryService = new Mock<IInventoryChangeService>();
            var service = new ProductsInWarehouseService(context, mockInventoryService.Object);

            var user = TestDataSeeder.CreateTestUser(context);
            var taxRate = TestDataSeeder.CreateTestTaxRate(context);
            var product = TestDataSeeder.CreateTestProduct(context, taxRate.Id);
            var fromLocation = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");
            var toLocation = TestDataSeeder.CreateTestLocation(context, "BBBB-0002-0202");
            TestDataSeeder.AddProductToWarehouse(context, product.Id, fromLocation.Id, 50);

            // Act
            var result = await service.TransferProductAsync(product.Id, fromLocation.Id, toLocation.Id, 50, user.Id);

            // Assert
            result.Should().BeTrue();

            var fromInventory = await context.ProductsInWarehouse
                .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.LocationId == fromLocation.Id);
            fromInventory.Should().BeNull(); // Entry removed entirely

            var toInventory = await context.ProductsInWarehouse
                .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.LocationId == toLocation.Id);
            toInventory.Should().NotBeNull();
            toInventory!.Quantity.Should().Be(50);
        }

        [Fact]
        public async Task TransferProduct_ToLocationWithExistingProduct_IncrementsQuantity()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var mockInventoryService = new Mock<IInventoryChangeService>();
            var service = new ProductsInWarehouseService(context, mockInventoryService.Object);

            var user = TestDataSeeder.CreateTestUser(context);
            var taxRate = TestDataSeeder.CreateTestTaxRate(context);
            var product = TestDataSeeder.CreateTestProduct(context, taxRate.Id);
            var fromLocation = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");
            var toLocation = TestDataSeeder.CreateTestLocation(context, "BBBB-0002-0202");
            TestDataSeeder.AddProductToWarehouse(context, product.Id, fromLocation.Id, 100);
            TestDataSeeder.AddProductToWarehouse(context, product.Id, toLocation.Id, 25); // Already has 25

            // Act
            var result = await service.TransferProductAsync(product.Id, fromLocation.Id, toLocation.Id, 40, user.Id);

            // Assert
            result.Should().BeTrue();

            var fromInventory = await context.ProductsInWarehouse
                .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.LocationId == fromLocation.Id);
            fromInventory!.Quantity.Should().Be(60); // 100 - 40

            var toInventory = await context.ProductsInWarehouse
                .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.LocationId == toLocation.Id);
            toInventory!.Quantity.Should().Be(65); // 25 + 40
        }

        #endregion
    }
}
