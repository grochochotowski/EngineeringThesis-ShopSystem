using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Enums;
using Backend.Api.Objects.Entities.Models;

namespace BackendTest.TestHelpers
{
    /// <summary>
    /// Fluent builder for creating test DTOs with default values
    /// </summary>
    public partial class TestDataBuilder
    {
        public static POSFinalizationDtoBuilder POSFinalization() => new POSFinalizationDtoBuilder();
        public static POSReturnDtoBuilder POSReturn() => new POSReturnDtoBuilder();
        public static CreateSalesDocumentDtoBuilder CreateSalesDocument() => new CreateSalesDocumentDtoBuilder();
        public static CreateShipmentDtoBuilder CreateShipmentDto() => new CreateShipmentDtoBuilder();
        public static UpdateShipmentDtoBuilder UpdateShipmentDto() => new UpdateShipmentDtoBuilder();
        public static CompleteCollectionDtoBuilder CompleteCollectionDto() => new CompleteCollectionDtoBuilder();
    }

    public class POSFinalizationDtoBuilder
    {
        private readonly POSFinalizationDto _dto;

        public POSFinalizationDtoBuilder()
        {
            _dto = new POSFinalizationDto
            {
                DocumentType = SalesDocumentType.Receipt,
                ClientId = null,
                Items = new List<POSCartItemDto>(),
                Payments = new List<POSPaymentDto>(),
                UserId = 1
            };
        }

        public POSFinalizationDtoBuilder WithDocumentType(SalesDocumentType type)
        {
            _dto.DocumentType = type;
            return this;
        }

        public POSFinalizationDtoBuilder WithClient(int clientId)
        {
            _dto.ClientId = clientId;
            return this;
        }

        public POSFinalizationDtoBuilder WithUser(int userId)
        {
            _dto.UserId = userId;
            return this;
        }

        public POSFinalizationDtoBuilder AddItem(int productId, string name, string sku, int quantity, decimal unitGross, int taxRateId, int? locationId = null)
        {
            _dto.Items.Add(new POSCartItemDto
            {
                ProductId = productId,
                ProductName = name,
                ProductSKU = sku,
                Quantity = quantity,
                UnitGross = unitGross,
                TaxRateId = taxRateId,
                FromLocationId = locationId
            });
            return this;
        }

        public POSFinalizationDtoBuilder AddPayment(PaymentOption option, decimal amount, decimal? tendered = null, int? giftCardId = null)
        {
            var payment = new POSPaymentDto
            {
                PaymentOption = option,
                Amount = amount,
                GiftCardId = giftCardId
            };

            if (tendered.HasValue)
            {
                payment.AmountTendered = tendered;
                payment.Change = tendered - amount;
            }

            _dto.Payments.Add(payment);
            return this;
        }

        public POSFinalizationDto Build() => _dto;
    }

    public class POSReturnDtoBuilder
    {
        private readonly POSReturnDto _dto;

        public POSReturnDtoBuilder()
        {
            _dto = new POSReturnDto
            {
                OriginalDocumentNumber = string.Empty,
                Items = new List<POSReturnItemDto>(),
                RefundMethod = PaymentOption.Cash,
                UserId = 1
            };
        }

        public POSReturnDtoBuilder WithOriginalDocument(string documentNumber)
        {
            _dto.OriginalDocumentNumber = documentNumber;
            return this;
        }

        public POSReturnDtoBuilder WithRefundMethod(PaymentOption method)
        {
            _dto.RefundMethod = method;
            return this;
        }

        public POSReturnDtoBuilder WithUser(int userId)
        {
            _dto.UserId = userId;
            return this;
        }

        public POSReturnDtoBuilder AddReturnItem(int originalItemId, int productId, string name, string sku, int returnQuantity, decimal unitGross, int taxRateId)
        {
            var item = new POSReturnItemDto
            {
                OriginalItemId = originalItemId,
                ProductId = productId,
                ProductName = name,
                ProductSKU = sku,
                ReturnQuantity = returnQuantity,
                UnitGross = unitGross,
                TaxRateId = taxRateId,
                Locations = new List<POSReturnLocationDto>()
            };

            _dto.Items.Add(item);
            return this;
        }

        public POSReturnDtoBuilder AddLocationToLastItem(int locationId, int quantity)
        {
            if (_dto.Items.Count == 0)
                throw new InvalidOperationException("No items added yet");

            _dto.Items.Last().Locations.Add(new POSReturnLocationDto
            {
                ToLocationId = locationId,
                Quantity = quantity
            });

            return this;
        }

        public POSReturnDto Build() => _dto;
    }

    public class CreateSalesDocumentDtoBuilder
    {
        private readonly CreateSalesDocumentDto _dto;

        public CreateSalesDocumentDtoBuilder()
        {
            _dto = new CreateSalesDocumentDto
            {
                DocumentType = SalesDocumentType.Receipt,
                IssueDate = DateTimeOffset.Now,
                DocumentNumber = $"TEST-{Guid.NewGuid().ToString().Substring(0, 8)}",
                Items = new List<CreateSalesDocumentItemDto>(),
                Payments = new List<CreateSalesPaymentDto>()
            };
        }

        public CreateSalesDocumentDtoBuilder WithDocumentType(SalesDocumentType type)
        {
            _dto.DocumentType = type;
            return this;
        }

        public CreateSalesDocumentDtoBuilder WithDocumentNumber(string number)
        {
            _dto.DocumentNumber = number;
            return this;
        }

        public CreateSalesDocumentDtoBuilder WithClient(int clientId)
        {
            _dto.ClientId = clientId;
            return this;
        }

        public CreateSalesDocumentDtoBuilder AddItem(int productId, string name, string sku, int quantity, decimal unitGross, int taxRateId, int? locationId = null)
        {
            _dto.Items.Add(new CreateSalesDocumentItemDto
            {
                ProductId = productId,
                ProductName = name,
                ProductSKU = sku,
                Quantity = quantity,
                UnitGross = unitGross,
                TaxRateId = taxRateId,
                FromLocationId = locationId
            });
            return this;
        }

        public CreateSalesDocumentDtoBuilder AddPayment(PaymentOption option, decimal amount)
        {
            _dto.Payments.Add(new CreateSalesPaymentDto
            {
                PaymentOption = option,
                Amount = amount
            });
            return this;
        }

        public CreateSalesDocumentDto Build() => _dto;
    }

    public class CreateShipmentDtoBuilder
    {
        private readonly CreateShipmentDto _dto;

        public CreateShipmentDtoBuilder()
        {
            _dto = new CreateShipmentDto
            {
                Type = (int)ShipmentType.Incoming,
                Status = (int)ShipmentStatus.InPreparation,
                SenderName = "Test Sender",
                ReceiverName = "Test Receiver"
            };
        }

        public CreateShipmentDtoBuilder WithType(ShipmentType type)
        {
            _dto.Type = (int)type;
            return this;
        }

        public CreateShipmentDtoBuilder WithStatus(ShipmentStatus status)
        {
            _dto.Status = (int)status;
            return this;
        }

        public CreateShipmentDtoBuilder WithSenderName(string name)
        {
            _dto.SenderName = name;
            return this;
        }

        public CreateShipmentDtoBuilder WithSenderAddressId(int? id)
        {
            _dto.SenderAddressId = id;
            return this;
        }

        public CreateShipmentDtoBuilder WithReceiverName(string name)
        {
            _dto.ReceiverName = name;
            return this;
        }

        public CreateShipmentDtoBuilder WithReceiverAddressId(int? id)
        {
            _dto.ReceiverAddressId = id;
            return this;
        }

        public CreateShipmentDtoBuilder WithDimensions(decimal weight, decimal length, decimal width, decimal height)
        {
            _dto.Weight = weight;
            _dto.Length = length;
            _dto.Width = width;
            _dto.Height = height;
            return this;
        }

        public CreateShipmentDto Build() => _dto;
    }

    public class UpdateShipmentDtoBuilder
    {
        private readonly UpdateShipmentDto _dto;

        public UpdateShipmentDtoBuilder()
        {
            _dto = new UpdateShipmentDto
            {
                Type = (int)ShipmentType.Incoming,
                Status = (int)ShipmentStatus.InPreparation,
                SenderName = "Test Sender",
                ReceiverName = "Test Receiver"
            };
        }

        public UpdateShipmentDtoBuilder WithType(ShipmentType type)
        {
            _dto.Type = (int)type;
            return this;
        }

        public UpdateShipmentDtoBuilder WithStatus(ShipmentStatus status)
        {
            _dto.Status = (int)status;
            return this;
        }

        public UpdateShipmentDtoBuilder WithSenderName(string name)
        {
            _dto.SenderName = name;
            return this;
        }

        public UpdateShipmentDtoBuilder WithSenderAddressId(int? id)
        {
            _dto.SenderAddressId = id;
            return this;
        }

        public UpdateShipmentDtoBuilder WithReceiverName(string name)
        {
            _dto.ReceiverName = name;
            return this;
        }

        public UpdateShipmentDtoBuilder WithReceiverAddressId(int? id)
        {
            _dto.ReceiverAddressId = id;
            return this;
        }

        public UpdateShipmentDtoBuilder WithDimensions(decimal weight, decimal length, decimal width, decimal height)
        {
            _dto.Weight = weight;
            _dto.Length = length;
            _dto.Width = width;
            _dto.Height = height;
            return this;
        }

        public UpdateShipmentDto Build() => _dto;
    }

    public class CompleteCollectionDtoBuilder
    {
        private readonly CompleteCollectionDto _dto;

        public CompleteCollectionDtoBuilder()
        {
            _dto = new CompleteCollectionDto
            {
                CollectedProducts = new List<CreateShipmentProductCollectionDto>()
            };
        }

        public CompleteCollectionDtoBuilder AddProduct(int productId, int quantity, List<int> locationIds)
        {
            _dto.CollectedProducts.Add(new CreateShipmentProductCollectionDto
            {
                ProductId = productId,
                CollectedQuantity = quantity,
                LocationIds = locationIds
            });
            return this;
        }

        public CompleteCollectionDto Build() => _dto;
    }
}