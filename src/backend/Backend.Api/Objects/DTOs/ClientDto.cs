using Backend.Api.Objects.Entities.Models;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs
{
    public class GetClientDto
    {
                                                    public int Id                       { get; set; }
                                                    public string Name                  { get; set; } = default!;
                                                    public string Email                 { get; set; } = default!;
                                                    public string PhoneNumber           { get; set; } = default!;
                                                    public ClientType Type              { get; set; }
                                                    public int AddressId                { get; set; }
    }

    public class CreateClientDto
    {
        [Required, MaxLength(128)]                  public string Name                  { get; set; } = default!;
        [Required, MaxLength(64), EmailAddress]     public string Email                 { get; set; } = default!;
        [Required, MaxLength(32), Phone]            public string PhoneNumber           { get; set; } = default!;
        [Required]                                  public ClientType Type              { get; set; }
                                                    public int? AddressId               { get; set; }
                                                    public CreateAddressDto? Address    { get; set; }
    }

    public class UpdateClientDto
    {
        [Required, MaxLength(128)]                  public string Name                  { get; set; } = default!;
        [Required, MaxLength(64), EmailAddress]     public string Email                 { get; set; } = default!;
        [Required, MaxLength(32), Phone]            public string PhoneNumber           { get; set; } = default!;
        [Required]                                  public ClientType Type              { get; set; }
                                                    public int? AddressId               { get; set; }
                                                    public CreateAddressDto? Address    { get; set; }
    }
}