using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    public class DeliveryCompany
    {
        [Key] public int Id { get; set; }
        [Required] public string Name { get; set; }
        [Required] public string ContactNumber { get; set; }
        [Required] public string Email { get; set; }

        // relationships 1:1
        [Required] public int AddressId { get; set; }
        public virtual Address Address { get; set; }
    }
}
