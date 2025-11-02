using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs
{
    // --- GET DELIVERY COMPANY INFO ---
    public class GetDeliveryCompanyDto
    {
                                                    public int Id                       { get; set; }
                                                    public string Name                  { get; set; } = default!;
                                                    public string PhoneNumber           { get; set; } = default!;
                                                    public string Email                 { get; set; } = default!;
                                                    public int AddressId                { get; set; }
                                                    public GetAddressDto? Address       { get; set; }
    }

    // --- CREATE DELIVERY COMPANY ---
    public class CreateDeliveryCompanyDto
    {
        [Required, MaxLength(64)]                   public string Name                  { get; set; } = default!;
        [Required, MaxLength(32)]                   public string PhoneNumber           { get; set; } = default!;
        [Required, MaxLength(64), EmailAddress]     public string Email                 { get; set; } = default!;
                                                    public int? AddressId               { get; set; }
                                                    public CreateAddressDto? Address    { get; set; }

    }

    // --- UPDATE DELIVERY COMPANY ---
    public class UpdateDeliveryCompanyDto
    {
        [Required, MaxLength(64)]                   public string Name                  { get; set; } = default!;
        [Required, MaxLength(32)]                   public string PhoneNumber           { get; set; } = default!;
        [Required, MaxLength(64), EmailAddress]     public string Email                 { get; set; } = default!;
                                                    public int? AddressId               { get; set; }
                                                    public CreateAddressDto? Address    { get; set; }
    }
}
