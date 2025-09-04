using Backend.Api.Objects.Entities.Models;
using Microsoft.EntityFrameworkCore;
using System.Net;

namespace Backend.Api.Objects.Entities
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions options) : base(options) { }

        public DbSet<Product> Products{ get; set; }
    }
}
