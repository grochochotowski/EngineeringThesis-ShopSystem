using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs
{
    public class GetAddressDto
    {
        public int Id { get; set; }
        public string Country { get; set; } = default!;
        public string City { get; set; } = default!;
        public string Street { get; set; } = default!;
        public string Building { get; set; } = default!;
        public string? Premises { get; set; }
        public string PostalCode { get; set; } = default!;
    }

    public class CreateAddressDto
    {
        [Required, MaxLength(64)] public string Country { get; set; } = default!;
        [Required, MaxLength(64)] public string City { get; set; } = default!;
        [Required, MaxLength(128)] public string Street { get; set; } = default!;
        [Required, MaxLength(16)] public string Building { get; set; } = default!;
        [MaxLength(16)] public string? Premises { get; set; }
        [Required, MaxLength(16)] public string PostalCode { get; set; } = default!;
    }

    public class UpdateAddressDto
    {
        [Required, MaxLength(64)] public string Country { get; set; } = default!;
        [Required, MaxLength(64)] public string City { get; set; } = default!;
        [Required, MaxLength(128)] public string Street { get; set; } = default!;
        [Required, MaxLength(16)] public string Building { get; set; } = default!;
        [MaxLength(16)] public string? Premises { get; set; }
        [Required, MaxLength(16)] public string PostalCode { get; set; } = default!;
    }
}
