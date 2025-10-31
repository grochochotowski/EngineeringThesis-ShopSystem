namespace Backend.Api.Objects.Entities.Models
{
    public class Shipment
    {
        // --- Key ---
        public int Id { get; set; }

        // --- Basic fields ---
        public ShipmentType Type            { get; set; }
        public ShipmentStatus Status        { get; set; }
        public DateTimeOffset SendDate      { get; set; }
        public DateTimeOffset? DeliveryDate { get; set; }

        // --- Foreign Keys ---
        public int DeliveryCompanyId    { get; set; }
        public int AddressSenderId      { get; set; }
        public int AddressReceiverId    { get; set; }

        // --- Navigation Properties ---
        public virtual DeliveryCompany DeliveryCompany  { get; set; } = default!;
        public virtual Address AddressSender            { get; set; } = default!;
        public virtual Address AddressReceiver          { get; set; } = default!;

        // --- Collections (N:N, 1:N) ---
        public virtual ICollection<Parcel> Parcels { get; set; } = new List<Parcel>();
    }
}
