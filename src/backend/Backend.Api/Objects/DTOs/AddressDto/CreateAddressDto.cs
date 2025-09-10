using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs.AddressDto
{
    public class CreateAddressDto
    {
        [Required, MaxLength(64)]  public string Country { get; set; } = default!;
        [Required, MaxLength(64)] public string City { get; set; } = default!;
        [Required, MaxLength(128)] public string Street { get; set; } = default!;
        [Required, MaxLength(16)] public string Building { get; set; } = default!;
        [MaxLength(16)] public string? Premises { get; set; }
        [Required, MaxLength(16)] public string PostalCode { get; set; } = default!;
    }
}
