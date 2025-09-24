using Backend.Api.Objects.Entities.Models;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs.UserDto
{
    public class CreateUserDto
    {
        [Required] public string FirstName { get; set; }
        [Required] public string LastName { get; set; }
        [Required] public string Email { get; set; }
        [Required] public string PhoneNumber { get; set; }
        [Required] public DateTime DateOfBirth { get; set; }
        [Required] public UserRole Role { get; set; }
        [Required] public string Login { get; set; }
        [Required] public string Password { get; set; }

        [Range(1, int.MaxValue)] public int AddressId { get; set; }
    }
}
