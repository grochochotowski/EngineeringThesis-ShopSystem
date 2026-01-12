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
    /// Comprehensive tests for Location and ProductsInWarehouse services.
    /// Covers CRUD operations, inventory management, and validation rules.
    /// </summary>
    public class StorageServiceTests : IClassFixture<DatabaseFixture>
    {
        private readonly DatabaseFixture _fixture;

        public StorageServiceTests(DatabaseFixture fixture)
        {
            _fixture = fixture;
        }

        #region Location CRUD Tests

        [Fact]
        public async Task CreateLocation_WithValidCodes_Success()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            var dto = new CreateLocationDto
            {
                Zone = "AAAA",
                Col = "0001",
                Shelf = "0101"
            };

            // Act
            var result = await service.CreateLocationAsync(dto);

            // Assert
            result.Should().NotBeNull();
            result.Id.Should().BeGreaterThan(0);
            result.Zone.Should().Be("AAAA");
            result.Col.Should().Be("0001");
            result.Shelf.Should().Be("0101");
            result.LocationCode.Should().Be("AAAA-0001-0101");
            result.IsActive.Should().BeTrue();
            result.ProductCount.Should().Be(0);
            result.TotalQuantity.Should().Be(0);
        }

        [Fact]
        public async Task CreateLocation_ZoneTooShort_ThrowsException()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            var dto = new CreateLocationDto
            {
                Zone = "AAA", // Only 3 characters
                Col = "0001",
                Shelf = "0101"
            };

            // Act & Assert
            var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateLocationAsync(dto));
            exception.Message.Should().Contain("Zone must be exactly 4 characters");
        }

        [Fact]
        public async Task CreateLocation_ZoneTooLong_ThrowsException()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            var dto = new CreateLocationDto
            {
                Zone = "AAAAA", // 5 characters
                Col = "0001",
                Shelf = "0101"
            };

            // Act & Assert
            var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateLocationAsync(dto));
            exception.Message.Should().Contain("Zone must be exactly 4 characters");
        }

        [Fact]
        public async Task CreateLocation_ColTooShort_ThrowsException()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            var dto = new CreateLocationDto
            {
                Zone = "AAAA",
                Col = "001", // Only 3 characters
                Shelf = "0101"
            };

            // Act & Assert
            var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateLocationAsync(dto));
            exception.Message.Should().Contain("Col must be exactly 4 characters");
        }

        [Fact]
        public async Task CreateLocation_ColTooLong_ThrowsException()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            var dto = new CreateLocationDto
            {
                Zone = "AAAA",
                Col = "00001", // 5 characters
                Shelf = "0101"
            };

            // Act & Assert
            var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateLocationAsync(dto));
            exception.Message.Should().Contain("Col must be exactly 4 characters");
        }

        [Fact]
        public async Task CreateLocation_ShelfTooShort_ThrowsException()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            var dto = new CreateLocationDto
            {
                Zone = "AAAA",
                Col = "0001",
                Shelf = "010" // Only 3 characters
            };

            // Act & Assert
            var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateLocationAsync(dto));
            exception.Message.Should().Contain("Shelf must be exactly 4 characters");
        }

        [Fact]
        public async Task CreateLocation_ShelfTooLong_ThrowsException()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            var dto = new CreateLocationDto
            {
                Zone = "AAAA",
                Col = "0001",
                Shelf = "01010" // 5 characters
            };

            // Act & Assert
            var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateLocationAsync(dto));
            exception.Message.Should().Contain("Shelf must be exactly 4 characters");
        }

        [Fact]
        public async Task CreateLocation_DuplicateLocationCode_ThrowsException()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            var dto1 = new CreateLocationDto
            {
                Zone = "AAAA",
                Col = "0001",
                Shelf = "0101"
            };

            await service.CreateLocationAsync(dto1);

            var dto2 = new CreateLocationDto
            {
                Zone = "AAAA", // Same codes
                Col = "0001",
                Shelf = "0101"
            };

            // Act & Assert
            var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateLocationAsync(dto2));
            exception.Message.Should().Contain("already exists");
        }

        [Fact]
        public async Task UpdateLocation_WithValidCodes_Success()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            var createDto = new CreateLocationDto
            {
                Zone = "AAAA",
                Col = "0001",
                Shelf = "0101"
            };

            var created = await service.CreateLocationAsync(createDto);

            var updateDto = new UpdateLocationDto
            {
                Zone = "BBBB",
                Col = "0002",
                Shelf = "0202"
            };

            // Act
            var result = await service.UpdateLocationAsync(created.Id, updateDto);

            // Assert
            result.Should().BeTrue();

            var updated = await service.GetLocationByIdAsync(created.Id);
            updated.Should().NotBeNull();
            updated!.Zone.Should().Be("BBBB");
            updated.Col.Should().Be("0002");
            updated.Shelf.Should().Be("0202");
            updated.LocationCode.Should().Be("BBBB-0002-0202");
        }

        [Fact]
        public async Task UpdateLocation_WithInvalidZone_ThrowsException()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            var location = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");

            var updateDto = new UpdateLocationDto
            {
                Zone = "BBB", // Too short
                Col = "0002",
                Shelf = "0202"
            };

            // Act & Assert
            var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateLocationAsync(location.Id, updateDto));
            exception.Message.Should().Contain("Zone must be exactly 4 characters");
        }

        [Fact]
        public async Task UpdateLocation_WithInvalidCol_ThrowsException()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            var location = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");

            var updateDto = new UpdateLocationDto
            {
                Zone = "BBBB",
                Col = "002", // Too short
                Shelf = "0202"
            };

            // Act & Assert
            var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateLocationAsync(location.Id, updateDto));
            exception.Message.Should().Contain("Col must be exactly 4 characters");
        }

        [Fact]
        public async Task UpdateLocation_WithInvalidShelf_ThrowsException()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            var location = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");

            var updateDto = new UpdateLocationDto
            {
                Zone = "BBBB",
                Col = "0002",
                Shelf = "202" // Too short
            };

            // Act & Assert
            var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateLocationAsync(location.Id, updateDto));
            exception.Message.Should().Contain("Shelf must be exactly 4 characters");
        }

        [Fact]
        public async Task UpdateLocation_ConflictingLocationCode_ThrowsException()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            var location1 = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");
            var location2 = TestDataSeeder.CreateTestLocation(context, "BBBB-0002-0202");

            var updateDto = new UpdateLocationDto
            {
                Zone = "AAAA", // Trying to update to location1's code
                Col = "0001",
                Shelf = "0101"
            };

            // Act & Assert
            var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpdateLocationAsync(location2.Id, updateDto));
            exception.Message.Should().Contain("already exists");
        }

        [Fact]
        public async Task UpdateLocation_NonExistentLocation_ReturnsFalse()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            var updateDto = new UpdateLocationDto
            {
                Zone = "AAAA",
                Col = "0001",
                Shelf = "0101"
            };

            // Act
            var result = await service.UpdateLocationAsync(99999, updateDto);

            // Assert
            result.Should().BeFalse();
        }

        [Fact]
        public async Task DeleteLocation_WithNoProducts_Success()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            var location = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");

            // Act
            var result = await service.DeleteLocationAsync(location.Id);

            // Assert
            result.Should().BeTrue();

            var deleted = await context.Locations.FindAsync(location.Id);
            deleted.Should().BeNull();
        }

        [Fact]
        public async Task DeleteLocation_WithProducts_ThrowsException()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            var taxRate = TestDataSeeder.CreateTestTaxRate(context);
            var product = TestDataSeeder.CreateTestProduct(context, taxRate.Id);
            var location = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");
            TestDataSeeder.AddProductToWarehouse(context, product.Id, location.Id, 10);

            // Act & Assert
            var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => service.DeleteLocationAsync(location.Id));
            exception.Message.Should().Contain("Cannot delete location with assigned products");
        }

        [Fact]
        public async Task DeleteLocation_NonExistent_ReturnsFalse()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            // Act
            var result = await service.DeleteLocationAsync(99999);

            // Assert
            result.Should().BeFalse();
        }

        [Fact]
        public async Task DeactivateLocation_Success()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            var location = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");

            // Act
            var result = await service.DeactivateLocationAsync(location.Id);

            // Assert
            result.Should().BeTrue();

            var deactivated = await service.GetLocationByIdAsync(location.Id);
            deactivated!.IsActive.Should().BeFalse();
        }

        [Fact]
        public async Task ActivateLocation_Success()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            var location = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");
            await service.DeactivateLocationAsync(location.Id);

            // Act
            var result = await service.ActivateLocationAsync(location.Id);

            // Assert
            result.Should().BeTrue();

            var activated = await service.GetLocationByIdAsync(location.Id);
            activated!.IsActive.Should().BeTrue();
        }

        #endregion

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

        #region Integration Tests

        [Fact]
        public async Task FullWarehouseWorkflow_Success()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var locationService = new LocationService(context);
            var mockInventoryService = new Mock<IInventoryChangeService>();
            var productsService = new ProductsInWarehouseService(context, mockInventoryService.Object);

            var user = TestDataSeeder.CreateTestUser(context);
            var taxRate = TestDataSeeder.CreateTestTaxRate(context);
            var product = TestDataSeeder.CreateTestProduct(context, taxRate.Id);

            // 1. Create locations
            var locationA = await locationService.CreateLocationAsync(new CreateLocationDto
            {
                Zone = "AAAA",
                Col = "0001",
                Shelf = "0101"
            });

            var locationB = await locationService.CreateLocationAsync(new CreateLocationDto
            {
                Zone = "BBBB",
                Col = "0002",
                Shelf = "0202"
            });

            // 2. Add products to location A
            await productsService.AddProductToLocationAsync(product.Id, locationA.Id, 100, user.Id);

            // 3. Verify location A has 100 units
            var locA1 = await locationService.GetLocationByIdAsync(locationA.Id);
            locA1!.ProductCount.Should().Be(1);
            locA1.TotalQuantity.Should().Be(100);

            // 4. Transfer 40 units from A to B
            await productsService.TransferProductAsync(product.Id, locationA.Id, locationB.Id, 40, user.Id);

            // 5. Verify quantities
            var locA2 = await locationService.GetLocationByIdAsync(locationA.Id);
            locA2!.TotalQuantity.Should().Be(60);

            var locB1 = await locationService.GetLocationByIdAsync(locationB.Id);
            locB1!.TotalQuantity.Should().Be(40);

            // 6. Remove 20 units from location B
            await productsService.RemoveProductFromLocationAsync(product.Id, locationB.Id, 20, user.Id);

            // 7. Verify final state
            var locB2 = await locationService.GetLocationByIdAsync(locationB.Id);
            locB2!.TotalQuantity.Should().Be(20);

            // 8. Remove all from B
            await productsService.RemoveProductFromLocationAsync(product.Id, locationB.Id, 20, user.Id);

            // 9. Try to delete location B (should succeed now)
            var deleteB = await locationService.DeleteLocationAsync(locationB.Id);
            deleteB.Should().BeTrue();

            // 10. Try to delete location A (should fail - still has products)
            var deleteA = await Assert.ThrowsAsync<InvalidOperationException>(() => locationService.DeleteLocationAsync(locationA.Id));
            deleteA.Message.Should().Contain("Cannot delete location with assigned products");
        }

        [Fact]
        public async Task LocationCodeFormatting_ConvertsToUpperCase()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            var dto = new CreateLocationDto
            {
                Zone = "aaaa", // lowercase
                Col = "bb01",
                Shelf = "cc02"
            };

            // Act
            var result = await service.CreateLocationAsync(dto);

            // Assert
            result.Zone.Should().Be("AAAA");
            result.Col.Should().Be("BB01");
            result.Shelf.Should().Be("CC02");
            result.LocationCode.Should().Be("AAAA-BB01-CC02");
        }

        [Fact]
        public async Task GetLocationsByProductId_ReturnsAllLocations()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var mockInventoryService = new Mock<IInventoryChangeService>();
            var service = new ProductsInWarehouseService(context, mockInventoryService.Object);

            var user = TestDataSeeder.CreateTestUser(context);
            var taxRate = TestDataSeeder.CreateTestTaxRate(context);
            var product = TestDataSeeder.CreateTestProduct(context, taxRate.Id);
            var location1 = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");
            var location2 = TestDataSeeder.CreateTestLocation(context, "BBBB-0002-0202");
            var location3 = TestDataSeeder.CreateTestLocation(context, "CCCC-0003-0303");

            await service.AddProductToLocationAsync(product.Id, location1.Id, 10, user.Id);
            await service.AddProductToLocationAsync(product.Id, location2.Id, 20, user.Id);
            await service.AddProductToLocationAsync(product.Id, location3.Id, 30, user.Id);

            // Act
            var locations = await service.GetLocationsByProductIdAsync(product.Id);

            // Assert
            locations.Should().HaveCount(3);
            locations.Should().Contain(l => l.LocationId == location1.Id && l.Quantity == 10);
            locations.Should().Contain(l => l.LocationId == location2.Id && l.Quantity == 20);
            locations.Should().Contain(l => l.LocationId == location3.Id && l.Quantity == 30);
        }

        #endregion
    }
}
