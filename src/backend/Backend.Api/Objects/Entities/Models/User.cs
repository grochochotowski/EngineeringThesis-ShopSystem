using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    public class User
    {
        [Key] public int Id { get; set; }
        [Required] public string FirstName { get; set; }
        [Required] public string LastName { get; set; }
        [Required] public string Email { get; set; }
        [Required] public string PhoneNumber { get; set; }
        [Required] public DateTime DateOfBirth { get; set; }
        [Required] public UserRole Role { get; set; }
        [Required] public string Login { get; set; }
        [Required] public string Password { get; set; }

        // relationships 1:1
        [Required] public int AddressId { get; set; }
        public virtual Address Address { get; set; }
    }
}
