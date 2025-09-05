using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    public class Client
    {
        [Key] public int Id { get; set; }
        [Required] public string FirstName { get; set; }
        [Required] public string LastName { get; set; }
        [Required] public string Email { get; set; }
        [Required] public string PhoneNumber { get; set; }
        [Required] public DateTime DateOfBirth { get; set; }
        [Required] public ClientType Type { get; set; }

        // relationships 1:1
        [Required] public int AddressId { get; set; }
        public virtual Address Address { get; set; } = default!;
    }
}
