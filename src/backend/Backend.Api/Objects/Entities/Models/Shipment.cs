using Backend.Api.Objects.Entities.Models.Relations;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    public class Shipment
    {
        // --- Key ---
        public int Id { get; set; }

        // --- Basic fields ---
        public ShipmentType Type                { get; set; }
        public ShipmentStatus Status            { get; set; }
        public DateTimeOffset? SendDate         { get; set; }
        public DateTimeOffset? DeliveryDate     { get; set; }

        // --- Parcel fields (from old Parcel entity) ---
        public string? Description  { get; set; }
        public decimal? Weight      { get; set; }
        public decimal? Length      { get; set; }
        public decimal? Width       { get; set; }
        public decimal? Height      { get; set; }

        // --- Sender Information ---
        [MaxLength(128)]
        public string? SenderName       { get; set; }
        [MaxLength(32)]
        public string? SenderTaxId      { get; set; }
        public int? SenderAddressId     { get; set; }
        public string? SenderDetails    { get; set; }

        // --- Receiver Information ---
        [MaxLength(128)]
        public string? ReceiverName     { get; set; }
        [MaxLength(32)]
        public string? ReceiverTaxId    { get; set; }
        public int? ReceiverAddressId   { get; set; }
        public string? ReceiverDetails  { get; set; }

        // --- Navigation Properties ---
        public virtual Address? SenderAddress   { get; set; }
        public virtual Address? ReceiverAddress { get; set; }

        // --- Collections (M:N via ShipmentProduct) ---
        public virtual ICollection<ShipmentProduct> ShipmentProducts { get; set; } = new List<ShipmentProduct>();
    }
}
