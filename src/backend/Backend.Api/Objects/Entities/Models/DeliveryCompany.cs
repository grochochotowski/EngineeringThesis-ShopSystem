using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    public class DeliveryCompany
    {
        [Key] public int Id { get; set; }
        [Required, MaxLength(64)] public string Name { get; set; } = default!;
        [Required, MaxLength(64), EmailAddress] public string Email { get; set; } = default!;
        [Required, MaxLength(32), Phone] public string PhoneNumber { get; set; } = default!;

        // relationships 1:1  (1 DeliveryCompany - 1 Address)
        [Required] public int AddressId { get; set; }
        public virtual Address Address { get; set; } = default!;
    }
}
