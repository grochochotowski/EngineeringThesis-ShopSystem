using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities.Models;
using BackendTest.TestHelpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models.Relations;
using Backend.Api.Objects.Entities.Enums;
using System.ComponentModel.DataAnnotations;

namespace BackendTest.Services
{
    public class ShipmentServiceTests : IClassFixture<DatabaseFixture>
    {
        private readonly DatabaseFixture _fixture;
        private readonly IAddressService _addressService;
        private readonly IInventoryChangeService _inventoryChangeService;

        public ShipmentServiceTests(DatabaseFixture fixture)
        {
            _fixture = fixture;
            var addressServiceMock = new Mock<IAddressService>();
            var inventoryChangeServiceMock = new Mock<IInventoryChangeService>();
            _addressService = addressServiceMock.Object;
            _inventoryChangeService = inventoryChangeServiceMock.Object;
        }

        private ShipmentService CreateService(AppDbContext context)
        {
            return new ShipmentService(context, _addressService, _inventoryChangeService);
        }

        #region Add New Shipment Tests

        [Fact]
        public async Task ShipmentIncoming_AddNew_CorrectData_Success()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);
            var address = new Address { Street = "Test Street 1", City = "Test City", PostalCode = "12345", Country = Country.Poland, Building="1", Premises="1" };
            context.Addresses.Add(address);
            await context.SaveChangesAsync();

            var dto = TestDataBuilder.CreateShipmentDto()
                .WithSenderAddressId(address.Id)
                .WithReceiverAddressId(address.Id)
                .Build();

            // Act
            var result = await service.CreateAsync(dto);

            // Assert
            result.Should().NotBeNull();
            result.SenderName.Should().Be("Test Sender");
            var shipmentInDb = await context.Shipments.FindAsync(result.Id);
            shipmentInDb.Should().NotBeNull();
        }

        [Fact]
        public async Task ShipmentIncoming_AddNew_MissingSenderInformation_Error()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);
            var address = new Address { Street = "Test Street 2", City = "Test City", PostalCode = "12345", Country = Country.Poland, Building="1", Premises="1" };
            context.Addresses.Add(address);
            await context.SaveChangesAsync();

            var dto = TestDataBuilder.CreateShipmentDto()
                .WithSenderName(null)
                .WithStatus(ShipmentStatus.AwaitingPickup)
                .WithDimensions(1, 1, 1, 1)
                .WithSenderAddressId(address.Id)
                .WithReceiverAddressId(address.Id)
                .Build();

            // Act & Assert
            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateAsync(dto));
            ex.Message.Should().Be("Sender name is required for this status.");
        }

        [Fact]
        public async Task ShipmentIncoming_AddNew_MissingSenderAddress_Error()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);
             var address = new Address { Street = "Test Street 3", City = "Test City", PostalCode = "12345", Country = Country.Poland, Building="1", Premises="1" };
            context.Addresses.Add(address);
            await context.SaveChangesAsync();

            var dto = TestDataBuilder.CreateShipmentDto()
                .WithSenderAddressId(null)
                .WithStatus(ShipmentStatus.AwaitingPickup)
                .WithDimensions(1, 1, 1, 1)
                 .WithReceiverAddressId(address.Id)
                .Build();

            // Act & Assert
            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateAsync(dto));
            ex.Message.Should().Be("Sender address is required for this status.");
        }

        [Fact]
        public async Task ShipmentIncoming_AddNew_StatusReadyToCollect_NoSizes_Error()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);
            var address = new Address { Street = "Test Street 4", City = "Test City", PostalCode = "12345", Country = Country.Poland, Building="1", Premises="1" };
            context.Addresses.Add(address);
            await context.SaveChangesAsync();

            var dto = TestDataBuilder.CreateShipmentDto()
                .WithStatus(ShipmentStatus.AwaitingPickup)
                .WithSenderAddressId(address.Id)
                .WithReceiverAddressId(address.Id)
                .Build();

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateAsync(dto));
            ex.Message.Should().Be("Weight is required for this status.");
        }
        #endregion

        #region Edit Shipment Tests

        [Fact]
        public async Task ShipmentIncoming_Edit_CorrectData_Success()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);
            var address = new Address { Street = "Test Street 5", City = "Test City", PostalCode = "12345", Country = Country.Poland, Building="1", Premises="1" };
            context.Addresses.Add(address);

            var shipment = new Shipment
            {
                Type = ShipmentType.Incoming,
                Status = ShipmentStatus.InPreparation,
                SenderName = "Old Sender",
                ReceiverName = "Old Receiver",
                SenderAddressId = address.Id,
                ReceiverAddressId = address.Id
            };
            context.Shipments.Add(shipment);
            await context.SaveChangesAsync();

            var dto = TestDataBuilder.UpdateShipmentDto()
                .WithSenderName("New Sender")
                .WithSenderAddressId(address.Id)
                .WithReceiverAddressId(address.Id)
                .Build();

            // Act
            await service.UpdateAsync(shipment.Id, dto);

            // Assert
            var updatedShipment = await context.Shipments.FindAsync(shipment.Id);
            updatedShipment.SenderName.Should().Be("New Sender");
        }

        [Fact]
        public async Task ShipmentIncoming_Edit_MissingSenderInformation_Error()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);
            var address = new Address { Street = "Test Street 6", City = "Test City", PostalCode = "12345", Country = Country.Poland, Building="1", Premises="1" };
            context.Addresses.Add(address);

            var shipment = new Shipment
            {
                Type = ShipmentType.Incoming,
                Status = ShipmentStatus.InPreparation,
                SenderName = "Old Sender",
                ReceiverName = "Old Receiver",
                SenderAddressId = address.Id,
                ReceiverAddressId = address.Id
            };
            context.Shipments.Add(shipment);
            await context.SaveChangesAsync();

            var dto = TestDataBuilder.UpdateShipmentDto()
                .WithSenderName(null)
                .WithStatus(ShipmentStatus.AwaitingPickup)
                .WithDimensions(1, 1, 1, 1)
                .WithSenderAddressId(address.Id)
                .WithReceiverAddressId(address.Id)
                .Build();

            // Act & Assert
            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpdateAsync(shipment.Id, dto));
            ex.Message.Should().Be("Sender name is required for this status.");
        }

        [Fact]
        public async Task ShipmentIncoming_Edit_MissingSenderAddress_Error()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);
             var address = new Address { Street = "Test Street 7", City = "Test City", PostalCode = "12345", Country = Country.Poland, Building="1", Premises="1" };
            context.Addresses.Add(address);
            var shipment = new Shipment
            {
                Type = ShipmentType.Incoming,
                Status = ShipmentStatus.InPreparation,
                SenderName = "Old Sender",
                ReceiverName = "Old Receiver",
                SenderAddressId = address.Id,
                ReceiverAddressId = address.Id
            };
            context.Shipments.Add(shipment);
            await context.SaveChangesAsync();

            var dto = TestDataBuilder.UpdateShipmentDto()
                .WithSenderAddressId(null)
                .WithStatus(ShipmentStatus.AwaitingPickup)
                .WithDimensions(1, 1, 1, 1)
                .WithReceiverAddressId(address.Id)
                .Build();

            // Act & Assert
            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpdateAsync(shipment.Id, dto));
            ex.Message.Should().Be("Sender address is required for this status.");
        }

        [Fact]
        public async Task ShipmentIncoming_Edit_StatusReadyToCollect_NoSizes_Error()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);
            var address = new Address { Street = "Test Street 8", City = "Test City", PostalCode = "12345", Country = Country.Poland, Building="1", Premises="1" };
            context.Addresses.Add(address);

            var shipment = new Shipment
            {
                Type = ShipmentType.Incoming,
                Status = ShipmentStatus.InPreparation,
                SenderName = "Old Sender",
                ReceiverName = "Old Receiver",
                SenderAddressId = address.Id,
                ReceiverAddressId = address.Id
            };
            context.Shipments.Add(shipment);
            await context.SaveChangesAsync();

            var dto = TestDataBuilder.UpdateShipmentDto()
                .WithStatus(ShipmentStatus.AwaitingPickup)
                .WithSenderAddressId(address.Id)
                .WithReceiverAddressId(address.Id)
                .Build();

            // Act & Assert
            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpdateAsync(shipment.Id, dto));
            ex.Message.Should().Be("Weight is required for this status.");
        }

        #endregion

        #region Collect Shipment Tests

        [Fact]
        public async Task ShipmentIncoming_Collect_LocationSelected_NoQuantity_Error()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);

            var taxRate = new TaxRate { Rate = 0.23m, Code = "VAT23" };
            context.TaxRates.Add(taxRate);

            var product = new Product { Name = "Test Product", SKU = "TP001", Price = 10, TaxRate = taxRate, Description = "Test Description" };
            context.Products.Add(product);
            var location = new Location { Zone = "A", Col = "1", Shelf = "1", LocationCode="A-1-1" };
            context.Locations.Add(location);


            var shipment = new Shipment
            {
                Type = ShipmentType.Incoming,
                Status = ShipmentStatus.Delivered,
            };
            context.Shipments.Add(shipment);

            await context.SaveChangesAsync();

            var dto = TestDataBuilder.CompleteCollectionDto()
                .AddProduct(product.Id, 0, new List<int> { location.Id })
                .Build();

            // Act & Assert
            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.CompleteCollectionAsync(shipment.Id, dto, 1));
            ex.Message.Should().Be("Quantity must be greater than 0 if locations are selected.");
        }

        [Fact]
        public async Task ShipmentIncoming_Collect_LocationNotSelected_QuantityGiven_Error()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);
            var taxRate = new TaxRate { Rate = 0.23m, Code = "VAT24" };
            context.TaxRates.Add(taxRate);

            var product = new Product { Name = "Test Product", SKU = "TP002", Price = 10, TaxRate = taxRate, Description = "Test Description" };
            context.Products.Add(product);

            var shipment = new Shipment
            {
                Type = ShipmentType.Incoming,
                Status = ShipmentStatus.Delivered,
            };
            context.Shipments.Add(shipment);
            await context.SaveChangesAsync();

            var dto = TestDataBuilder.CompleteCollectionDto()
                .AddProduct(product.Id, 10, new List<int>())
                .Build();

            // Act & Assert
            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.CompleteCollectionAsync(shipment.Id, dto, 1));
            ex.Message.Should().Be("Locations must be selected if quantity is greater than 0.");
        }

        [Fact]
        public async Task ShipmentIncoming_Collect_LocationNotSelected_NoQuantity_Success()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);
            var taxRate = new TaxRate { Rate = 0.23m, Code = "VAT25" };
            context.TaxRates.Add(taxRate);
            var product = new Product { Name = "Test Product", SKU = "TP003", Price = 10, TaxRate = taxRate, Description = "Test Description" };
            context.Products.Add(product);

            var shipment = new Shipment
            {
                Type = ShipmentType.Incoming,
                Status = ShipmentStatus.Delivered,
            };
            context.Shipments.Add(shipment);
            await context.SaveChangesAsync();

            var dto = TestDataBuilder.CompleteCollectionDto()
                .AddProduct(product.Id, 0, new List<int>())
                .Build();

            // Act
            await service.CompleteCollectionAsync(shipment.Id, dto, 1);

            // Assert
            var updatedShipment = await context.Shipments.FindAsync(shipment.Id);
            updatedShipment.Status.Should().Be(ShipmentStatus.Collected);
        }

        [Fact]
        public async Task ShipmentIncoming_Collect_LocationSelected_QuantityGiven_Success()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);
            var taxRate = new TaxRate { Rate = 0.23m, Code = "VAT26" };
            context.TaxRates.Add(taxRate);
            var product = new Product { Name = "Test Product", SKU = "TP004", Price = 10, TaxRate = taxRate, Description = "Test Description" };
            context.Products.Add(product);
            var location = new Location { Zone = "B", Col = "2", Shelf = "2", LocationCode="B-2-2" };
            context.Locations.Add(location);

            var shipment = new Shipment
            {
                Type = ShipmentType.Incoming,
                Status = ShipmentStatus.Delivered,
            };
            context.Shipments.Add(shipment);

            await context.SaveChangesAsync();

            var dto = TestDataBuilder.CompleteCollectionDto()
                .AddProduct(product.Id, 10, new List<int> { location.Id })
                .Build();

            // Act
            await service.CompleteCollectionAsync(shipment.Id, dto, 1);

            // Assert
            var updatedShipment = await context.Shipments.FindAsync(shipment.Id);
            updatedShipment.Status.Should().Be(ShipmentStatus.Collected);
            var productInWarehouse = await context.ProductsInWarehouse.FirstOrDefaultAsync(p => p.ProductId == product.Id && p.LocationId == location.Id);
            productInWarehouse.Should().NotBeNull();
            productInWarehouse.Quantity.Should().Be(10);
        }

        #endregion

        #region Leaving Shipments Tests

        [Fact]
        public async Task ShipmentLeaving_AddNew_CorrectData_Success()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);
            var address = new Address { Street = "Test Street 9", City = "Test City", PostalCode = "12345", Country = Country.Poland, Building = "1", Premises = "1" };
            context.Addresses.Add(address);
            await context.SaveChangesAsync();

            var dto = TestDataBuilder.CreateShipmentDto()
                .WithType(ShipmentType.Outgoing)
                .WithSenderAddressId(address.Id)
                .WithReceiverAddressId(address.Id)
                .Build();

            // Act
            var result = await service.CreateAsync(dto);

            // Assert
            result.Should().NotBeNull();
            result.Type.Should().Be((int)ShipmentType.Outgoing);
            var shipmentInDb = await context.Shipments.FindAsync(result.Id);
            shipmentInDb.Should().NotBeNull();
        }

        [Fact]
        public async Task ShipmentLeaving_AddNew_MissingReceiverInformation_Error()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);
            var address = new Address { Street = "Test Street 10", City = "Test City", PostalCode = "12345", Country = Country.Poland, Building = "1", Premises = "1" };
            context.Addresses.Add(address);
            await context.SaveChangesAsync();

            var dto = TestDataBuilder.CreateShipmentDto()
                .WithType(ShipmentType.Outgoing)
                .WithReceiverName(null)
                .WithStatus(ShipmentStatus.AwaitingPickup)
                .WithDimensions(1, 1, 1, 1)
                .WithSenderAddressId(address.Id)
                .WithReceiverAddressId(address.Id)
                .Build();

            // Act & Assert
            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateAsync(dto));
            ex.Message.Should().Be("Receiver name is required for this status.");
        }

        [Fact]
        public async Task ShipmentLeaving_AddNew_MissingReceiverAddress_Error()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);
            var address = new Address { Street = "Test Street 11", City = "Test City", PostalCode = "12345", Country = Country.Poland, Building = "1", Premises = "1" };
            context.Addresses.Add(address);
            await context.SaveChangesAsync();

            var dto = TestDataBuilder.CreateShipmentDto()
                .WithType(ShipmentType.Outgoing)
                .WithReceiverAddressId(null)
                .WithStatus(ShipmentStatus.AwaitingPickup)
                .WithDimensions(1, 1, 1, 1)
                .WithSenderAddressId(address.Id)
                .Build();

            // Act & Assert
            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateAsync(dto));
            ex.Message.Should().Be("Receiver address is required for this status.");
        }

        [Fact]
        public async Task ShipmentLeaving_Edit_CorrectData_Success()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);
            var address = new Address { Street = "Test Street 12", City = "Test City", PostalCode = "12345", Country = Country.Poland, Building = "1", Premises = "1" };
            context.Addresses.Add(address);

            var shipment = new Shipment
            {
                Type = ShipmentType.Outgoing,
                Status = ShipmentStatus.InPreparation,
                SenderName = "Old Sender",
                ReceiverName = "Old Receiver",
                SenderAddressId = address.Id,
                ReceiverAddressId = address.Id
            };
            context.Shipments.Add(shipment);
            await context.SaveChangesAsync();

            var dto = TestDataBuilder.UpdateShipmentDto()
                .WithType(ShipmentType.Outgoing)
                .WithReceiverName("New Receiver")
                .WithSenderAddressId(address.Id)
                .WithReceiverAddressId(address.Id)
                .Build();

            // Act
            await service.UpdateAsync(shipment.Id, dto);

            // Assert
            var updatedShipment = await context.Shipments.FindAsync(shipment.Id);
            updatedShipment.ReceiverName.Should().Be("New Receiver");
        }

        [Fact]
        public async Task ShipmentLeaving_Edit_MissingReceiverInformation_Error()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);
            var address = new Address { Street = "Test Street 13", City = "Test City", PostalCode = "12345", Country = Country.Poland, Building = "1", Premises = "1" };
            context.Addresses.Add(address);

            var shipment = new Shipment
            {
                Type = ShipmentType.Outgoing,
                Status = ShipmentStatus.InPreparation,
                SenderName = "Old Sender",
                ReceiverName = "Old Receiver",
                SenderAddressId = address.Id,
                ReceiverAddressId = address.Id
            };
            context.Shipments.Add(shipment);
            await context.SaveChangesAsync();

            var dto = TestDataBuilder.UpdateShipmentDto()
                .WithType(ShipmentType.Outgoing)
                .WithReceiverName(null)
                .WithStatus(ShipmentStatus.AwaitingPickup)
                .WithDimensions(1, 1, 1, 1)
                .WithSenderAddressId(address.Id)
                .WithReceiverAddressId(address.Id)
                .Build();

            // Act & Assert
            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpdateAsync(shipment.Id, dto));
            ex.Message.Should().Be("Receiver name is required for this status.");
        }

        [Fact]
        public async Task ShipmentLeaving_Edit_MissingReceiverAddress_Error()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);
            var address = new Address { Street = "Test Street 14", City = "Test City", PostalCode = "12345", Country = Country.Poland, Building = "1", Premises = "1" };
            context.Addresses.Add(address);
            var shipment = new Shipment
            {
                Type = ShipmentType.Outgoing,
                Status = ShipmentStatus.InPreparation,
                SenderName = "Old Sender",
                ReceiverName = "Old Receiver",
                SenderAddressId = address.Id,
                ReceiverAddressId = address.Id
            };
            context.Shipments.Add(shipment);
            await context.SaveChangesAsync();

            var dto = TestDataBuilder.UpdateShipmentDto()
                .WithType(ShipmentType.Outgoing)
                .WithReceiverAddressId(null)
                .WithStatus(ShipmentStatus.AwaitingPickup)
                .WithDimensions(1, 1, 1, 1)
                .WithSenderAddressId(address.Id)
                .Build();

            // Act & Assert
            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpdateAsync(shipment.Id, dto));
            ex.Message.Should().Be("Receiver address is required for this status.");
        }

        [Fact]
        public async Task ShipmentLeaving_Prepare_CorrectData_Success()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);
            var taxRate = new TaxRate { Rate = 0.23m, Code = "VAT27" };
            context.TaxRates.Add(taxRate);
            var product = new Product { Name = "Test Product", SKU = "TP005", Price = 10, TaxRate = taxRate, Description = "Test Description" };
            context.Products.Add(product);
            var location = new Location { Zone = "C", Col = "3", Shelf = "3", LocationCode = "C-3-3" };
            context.Locations.Add(location);
            var warehouseEntry = new ProductsInWarehouse { Product = product, Location = location, Quantity = 10 };
            context.ProductsInWarehouse.Add(warehouseEntry);

            var shipment = new Shipment
            {
                Type = ShipmentType.Outgoing,
                Status = ShipmentStatus.InPreparation,
            };
            var shipmentProduct = new ShipmentProduct { Product = product, Shipment = shipment, Quantity = 5 };
            shipment.ShipmentProducts.Add(shipmentProduct);
            context.Shipments.Add(shipment);

            await context.SaveChangesAsync();

            var dto = new CompletePreparationDto
            {
                IsFinishing = true,
                Weight = 1,
                Length = 1,
                Width = 1,
                Height = 1,
                PreparedProducts = new List<CreateShipmentProductPreparationDto>
                {
                    new CreateShipmentProductPreparationDto
                    {
                        ProductId = product.Id,
                        SourceLocations = new List<LocationQuantityDto>
                        {
                            new LocationQuantityDto { LocationId = location.Id, Quantity = 5 }
                        }
                    }
                }
            };

            // Act
            await service.CompletePreparationAsync(shipment.Id, dto, 1);

            // Assert
            var updatedShipment = await context.Shipments.FindAsync(shipment.Id);
            updatedShipment.Status.Should().Be(ShipmentStatus.AwaitingPickup);
            var productInWarehouse = await context.ProductsInWarehouse.FirstOrDefaultAsync(p => p.ProductId == product.Id && p.LocationId == location.Id);
            productInWarehouse.Quantity.Should().Be(5);
        }

        [Fact]
        public async Task ShipmentLeaving_Prepare_MissingSizes_Error()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);
            var taxRate = new TaxRate { Rate = 0.23m, Code = "VAT28" };
            context.TaxRates.Add(taxRate);
            var product = new Product { Name = "Test Product", SKU = "TP006", Price = 10, TaxRate = taxRate, Description = "Test Description" };
            context.Products.Add(product);
            var location = new Location { Zone = "D", Col = "4", Shelf = "4", LocationCode = "D-4-4" };
            context.Locations.Add(location);
            var warehouseEntry = new ProductsInWarehouse { Product = product, Location = location, Quantity = 10 };
            context.ProductsInWarehouse.Add(warehouseEntry);

            var shipment = new Shipment
            {
                Type = ShipmentType.Outgoing,
                Status = ShipmentStatus.InPreparation,
            };
            var shipmentProduct = new ShipmentProduct { Product = product, Shipment = shipment, Quantity = 5 };
            shipment.ShipmentProducts.Add(shipmentProduct);
            context.Shipments.Add(shipment);

            await context.SaveChangesAsync();

            var dto = new CompletePreparationDto
            {
                IsFinishing = true,
                PreparedProducts = new List<CreateShipmentProductPreparationDto>
                {
                    new CreateShipmentProductPreparationDto
                    {
                        ProductId = product.Id,
                        SourceLocations = new List<LocationQuantityDto>
                        {
                            new LocationQuantityDto { LocationId = location.Id, Quantity = 5 }
                        }
                    }
                }
            };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.CompletePreparationAsync(shipment.Id, dto, 1));
            ex.Message.Should().Be("All dimensions (Weight, Length, Width, Height) are required when finishing preparation.");
        }

        [Fact]
        public async Task ShipmentLeaving_Prepare_MissingProducts_Error()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);
            var shipment = new Shipment
            {
                Type = ShipmentType.Outgoing,
                Status = ShipmentStatus.InPreparation,
            };
            context.Shipments.Add(shipment);
            await context.SaveChangesAsync();

            var dto = new CompletePreparationDto
            {
                IsFinishing = true,
                Weight = 1,
                Length = 1,
                Width = 1,
                Height = 1,
                PreparedProducts = new List<CreateShipmentProductPreparationDto>()
            };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.CompletePreparationAsync(shipment.Id, dto, 1));
            ex.Message.Should().Be("At least one product must be prepared when finishing preparation.");
        }

        [Fact]
        public async Task ShipmentLeaving_Prepare_MissingLocation_Error()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);
            var taxRate = new TaxRate { Rate = 0.23m, Code = "VAT29" };
            context.TaxRates.Add(taxRate);
            var product = new Product { Name = "Test Product", SKU = "TP007", Price = 10, TaxRate = taxRate, Description = "Test Description" };
            context.Products.Add(product);
            var shipment = new Shipment
            {
                Type = ShipmentType.Outgoing,
                Status = ShipmentStatus.InPreparation,
            };
            var shipmentProduct = new ShipmentProduct { Product = product, Shipment = shipment, Quantity = 5 };
            shipment.ShipmentProducts.Add(shipmentProduct);
            context.Shipments.Add(shipment);
            await context.SaveChangesAsync();

            var dto = new CompletePreparationDto
            {
                IsFinishing = true,
                Weight = 1,
                Length = 1,
                Width = 1,
                Height = 1,
                PreparedProducts = new List<CreateShipmentProductPreparationDto>
                {
                    new CreateShipmentProductPreparationDto
                    {
                        ProductId = product.Id,
                        SourceLocations = new List<LocationQuantityDto>
                        {
                            new LocationQuantityDto { LocationId = 999, Quantity = 5 }
                        }
                    }
                }
            };
            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(() => service.CompletePreparationAsync(shipment.Id, dto, 1));
        }

        [Fact]
        public async Task ShipmentLeaving_Prepare_MissingQuantity_Error()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);
            var taxRate = new TaxRate { Rate = 0.23m, Code = "VAT30" };
            context.TaxRates.Add(taxRate);
            var product = new Product { Name = "Test Product", SKU = "TP008", Price = 10, TaxRate = taxRate, Description = "Test Description" };
            context.Products.Add(product);
            var location = new Location { Zone = "E", Col = "5", Shelf = "5", LocationCode = "E-5-5" };
            context.Locations.Add(location);
            var shipment = new Shipment
            {
                Type = ShipmentType.Outgoing,
                Status = ShipmentStatus.InPreparation,
            };
            var shipmentProduct = new ShipmentProduct { Product = product, Shipment = shipment, Quantity = 5 };
            shipment.ShipmentProducts.Add(shipmentProduct);
            context.Shipments.Add(shipment);
            await context.SaveChangesAsync();
            var dto = new CompletePreparationDto
            {
                IsFinishing = true,
                Weight = 1,
                Length = 1,
                Width = 1,
                Height = 1,
                PreparedProducts = new List<CreateShipmentProductPreparationDto>
                {
                    new CreateShipmentProductPreparationDto
                    {
                        ProductId = product.Id,
                        SourceLocations = new List<LocationQuantityDto>
                        {
                           new LocationQuantityDto { LocationId = location.Id, Quantity = 0 }
                        }
                    }
                }
            };
            // Act & Assert
            // The validation is done by the DTO, so the controller would return a BadRequest.
            // We are testing the service directly, so we expect a validation exception from the model binder,
            // but since we are not using a controller, we can't test that directly.
            // So we will check the validation attributes on the DTO.
            var validationContext = new ValidationContext(dto.PreparedProducts.First().SourceLocations.First(), null, null);
            var validationResults = new List<ValidationResult>();
            var isValid = Validator.TryValidateObject(dto.PreparedProducts.First().SourceLocations.First(), validationContext, validationResults, true);
            Assert.False(isValid);

        }
        #endregion

    }
}
