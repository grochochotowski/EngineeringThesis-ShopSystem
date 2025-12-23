using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models.Relations
{
    /// <summary>
    /// Tracks what was actually collected versus what was declared in the shipment.
    /// Used for incoming shipments to record discrepancies and warehouse locations.
    /// </summary>
    public class ShipmentProductCollection
    {
        // --- Key ---
        public int Id { get; set; }

        // --- Foreign Keys ---
        public int ShipmentId { get; set; }
        public int ProductId { get; set; }
        public int LocationId { get; set; }
        public int? CollectedByUserId { get; set; }

        // --- Navigation Properties ---
        public virtual Shipment Shipment { get; set; } = default!;
        public virtual Product Product { get; set; } = default!;
        public virtual Location Location { get; set; } = default!;
        public virtual User? CollectedByUser { get; set; }

        // --- Quantity Tracking ---
        /// <summary>
        /// Quantity declared in the shipment manifest (from ShipmentProduct)
        /// </summary>
        [Range(0, int.MaxValue)]
        public int DeclaredQuantity { get; set; }

        /// <summary>
        /// Quantity actually collected by warehouse staff
        /// May differ from declared (over/under delivery)
        /// </summary>
        [Range(0, int.MaxValue)]
        public int CollectedQuantity { get; set; }

        // --- Audit Fields ---
        /// <summary>
        /// When the collection occurred
        /// </summary>
        public DateTimeOffset CollectedAt { get; set; }
    }
}
