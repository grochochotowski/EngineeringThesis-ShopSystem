using Backend.Api.Objects.Entities.Models;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs.UserDto
{
    public class GetUserDto
    {
        public int Id { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Email { get; set; }
        public string PhoneNumber { get; set; }
        public DateTime DateOfBirth { get; set; }
        public UserRole Role { get; set; }
        public string Login { get; set; }
        public string Password { get; set; }

        public int AddressId { get; set; }
    }
}
