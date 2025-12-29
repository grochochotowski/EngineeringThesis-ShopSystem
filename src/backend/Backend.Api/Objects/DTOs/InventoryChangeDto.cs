using Backend.Api.Objects.Entities.Enums;

namespace Backend.Api.Objects.DTOs
{
    /// <summary>
    /// DTO for retrieving inventory change records
    /// </summary>
    public class GetInventoryChangeDto
    {
        public int Id { get; set; }
        public InventoryChangeType ChangeType { get; set; }
        public int Quantity { get; set; }
        public DateTime Timestamp { get; set; }
        public string? Notes { get; set; }

        // Product information
        public int ProductId { get; set; }
        public string ProductSku { get; set; } = default!;
        public string? ProductEan { get; set; }
        public string ProductName { get; set; } = default!;

        // Location information
        public int? FromLocationId { get; set; }
        public string? FromLocationCode { get; set; }
        public int? ToLocationId { get; set; }
        public string? ToLocationCode { get; set; }

        // User information
        public int UserId { get; set; }
        public string UserName { get; set; } = default!;
    }

    /// <summary>
    /// DTO for listing inventory changes (simplified version)
    /// </summary>
    public class GetInventoryChangeListItemDto
    {
        public int Id { get; set; }
        public InventoryChangeType ChangeType { get; set; }
        public int Quantity { get; set; }
        public DateTime Timestamp { get; set; }
        public string ProductSku { get; set; } = default!;
        public string ProductName { get; set; } = default!;
        public string? FromLocationCode { get; set; }
        public string? ToLocationCode { get; set; }
        public string UserName { get; set; } = default!;
    }

    /// <summary>
    /// DTO for creating inventory change records (used internally by service layer)
    /// </summary>
    public class CreateInventoryChangeDto
    {
        public InventoryChangeType ChangeType { get; set; }
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public int? FromLocationId { get; set; }
        public int? ToLocationId { get; set; }
        public int UserId { get; set; }
        public string? Notes { get; set; }
    }
}
