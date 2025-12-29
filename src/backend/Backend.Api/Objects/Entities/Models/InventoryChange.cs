using Backend.Api.Objects.Entities.Enums;

namespace Backend.Api.Objects.Entities.Models
{
    /// <summary>
    /// Tracks all inventory changes (additions, removals, movements, sales, collections, shipments).
    /// Provides a complete audit trail for inventory operations.
    /// </summary>
    public class InventoryChange
    {
        // --- Key ---
        public int Id { get; set; }

        // --- Basic fields ---
        /// <summary>
        /// Type of inventory change (Add, Remove, Move, Sell, Return, Collect, Send)
        /// </summary>
        public InventoryChangeType ChangeType { get; set; }

        /// <summary>
        /// Quantity changed (positive for additions, negative for removals)
        /// </summary>
        public int Quantity { get; set; }

        /// <summary>
        /// Timestamp when the change occurred (UTC)
        /// </summary>
        public DateTime Timestamp { get; set; }

        /// <summary>
        /// Optional notes or description for this change
        /// </summary>
        public string? Notes { get; set; }

        // --- Denormalized product information (for historical reference) ---
        /// <summary>
        /// Product SKU at the time of change (denormalized for historical reference)
        /// </summary>
        public string ProductSku { get; set; } = default!;

        /// <summary>
        /// Product EAN at the time of change (denormalized, nullable)
        /// </summary>
        public string? ProductEan { get; set; }

        // --- Foreign Keys ---
        /// <summary>
        /// Product that was changed
        /// </summary>
        public int ProductId { get; set; }

        /// <summary>
        /// Source location (nullable - null for additions from external sources)
        /// </summary>
        public int? FromLocationId { get; set; }

        /// <summary>
        /// Destination location (nullable - null for removals/sales)
        /// </summary>
        public int? ToLocationId { get; set; }

        /// <summary>
        /// User who performed the change
        /// </summary>
        public int UserId { get; set; }

        // --- Navigation Properties ---
        public virtual Product Product { get; set; } = default!;
        public virtual Location? FromLocation { get; set; }
        public virtual Location? ToLocation { get; set; }
        public virtual User User { get; set; } = default!;
    }
}
