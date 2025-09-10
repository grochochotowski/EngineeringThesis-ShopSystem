using Backend.Api.Objects.Entities.Models;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs.DeliveryCompanyDto
{
    public class CreateDeliveryCompanyDto
    {
        [Required, MaxLength(128)] public string Name { get; set; } = default!;
        [Required, MaxLength(256)] public string Description { get; set; } = default!;
        [Required, MaxLength(128), EmailAddress] public string Email { get; set; } = default!;
        [Required, MaxLength(24)] public string PhoneNumber { get; set; } = default!;
        [Required, Range(1, int.MaxValue)] public int AddressId { get; set; }
    }
}
