namespace Backend.Api.Objects.Entities.Models
{
    public class Category
    {
        // --- Key ---
        public int Id { get; set; }

        // --- Basic fields ---
        public string Name          { get; set; } = default!;
        public string? Description  { get; set; }
        public bool IsActive      { get; set; }
    }
}
