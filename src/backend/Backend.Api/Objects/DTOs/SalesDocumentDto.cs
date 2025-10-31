using Backend.Api.Objects.Entities.Models;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs
{
    public class GetSalesDocumentDto
    {
                                        public int Id                                       { get; set; }
                                        public SalesDocumentType DocumentType               { get; set; }
                                        public DateTimeOffset IssueDate                     { get; set; }
                                        public string DocumentNumber                        { get; set; } = default!;
                                        public int? ClientId                                { get; set; }
                                        public decimal TotalNet                             { get; set; }
                                        public decimal TotalTax                             { get; set; }
                                        public decimal TotalGross                           { get; set; }
                                        public IEnumerable<GetSalesDocumentItemDto> Items   { get; set; } = default!;
                                        public IEnumerable<GetSalesPaymentDto> Payments     { get; set; } = default!;
    }

    public class CreateSalesDocumentDto
    {
        [Required]                      public SalesDocumentType DocumentType               { get; set; }
        [Required]                      public DateTimeOffset IssueDate                     { get; set; }
        [Required, MaxLength(64)]       public string DocumentNumber                        { get; set; } = default!;
                                        public int? ClientId                                { get; set; }
        [Required]                      public List<CreateSalesDocumentItemDto> Items       { get; set; } = new();
        [Required]                      public List<CreateSalesPaymentDto> Payments         { get; set; } = new();
    }

    public class UpdateSalesDocumentDto
    {
        [Required]                      public SalesDocumentType DocumentType               { get; set; }
        [Required]                      public DateTimeOffset IssueDate                     { get; set; }
        [Required, MaxLength(64)]       public string DocumentNumber                        { get; set; } = default!;
                                        public int? ClientId                                { get; set; }
        [Required]                      public List<UpdateSalesDocumentItemDto> Items       { get; set; } = new();
        [Required]                      public List<UpdateSalesPaymentDto> Payments         { get; set; } = new();
    }
}
