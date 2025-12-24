using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models.Relations
{
    /// <summary>
    /// Junction table for tracking locations where shipment products are stored
    /// For INCOMING shipments: tracks where products were placed (destination locations)
    /// For OUTGOING shipments: tracks where products were taken from (source locations)
    /// </summary>
    public class ShipmentProductLocation
    {
        // --- Primary Key ---
        public int Id { get; set; }

        // --- Foreign Keys ---
        public int ShipmentId { get; set; }
        public int ProductId { get; set; }
        public int LocationId { get; set; }

        // --- Navigation Properties ---
        public virtual Shipment Shipment { get; set; } = default!;
        public virtual Product Product { get; set; } = default!;
        public virtual Location Location { get; set; } = default!;

        // --- Basic fields ---
        /// <summary>
        /// Quantity of product at this location for this shipment
        /// For incoming: how many placed at this location
        /// For outgoing: how many taken from this location
        /// </summary>
        [Range(1, int.MaxValue)]
        public int Quantity { get; set; }

        /// <summary>
        /// When this location entry was created
        /// </summary>
        public DateTimeOffset CreatedAt { get; set; }

        /// <summary>
        /// User who processed this location entry
        /// </summary>
        public int? ProcessedByUserId { get; set; }
        public virtual User? ProcessedByUser { get; set; }
    }
}
