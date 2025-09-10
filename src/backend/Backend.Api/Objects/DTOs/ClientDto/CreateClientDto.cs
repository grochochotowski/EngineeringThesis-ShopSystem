using Backend.Api.Objects.Entities.Models;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs.ClientDto
{
    public class CreateClientDto
    {
        [Required, MaxLength(64)] public string FirstName { get; set; } = default!;
        [Required, MaxLength(64)] public string LastName { get; set; } = default!;
        [Required, MaxLength(128), EmailAddress] public string Email { get; set; } = default!;
        [Required, MaxLength(24)] public string PhoneNumber { get; set; } = default!;
        [Required, DataType(DataType.Date)] public DateTime DateOfBirth { get; set; }
        [Required, EnumDataType(typeof(ClientType))] public ClientType Type { get; set; }
        [Required, Range(1, int.MaxValue)] public int AddressId { get; set; }    
    }
}
