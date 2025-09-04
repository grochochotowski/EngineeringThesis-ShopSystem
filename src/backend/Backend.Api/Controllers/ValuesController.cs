using Backend.Api.Objects.DTOs.ProductDto;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductController : ControllerBase
    {
        private readonly AppDbContext _db;
        public ProductController(AppDbContext db) => _db = db;
        
        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] string? q)
        {
            var query = _db.Products.AsNoTracking().OrderBy(p => p.Name).AsQueryable();
            if (!string.IsNullOrWhiteSpace(q))
                query = query.Where(p => p.Name.Contains(q) || p.SKU.Contains(q));
            return Ok(await query.ToListAsync());
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var p = await _db.Products.FindAsync(id);
            return p is null ? NotFound() : Ok(p);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateProductDto dto)
        {
            if (await _db.Products.AnyAsync(x => x.SKU == dto.SKU))
                return Conflict($"SKU '{dto.SKU}' już istnieje.");

            var p = new Product
            {
                SKU = dto.SKU,
                Name = dto.Name,
                Price = dto.Price,
                Stock = dto.Stock
            };

            _db.Products.Add(p);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = p.Id }, p);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] CreateProductDto dto)
        {
            var p = await _db.Products.FirstOrDefaultAsync(x => x.Id == id);
            if (p is null) return NotFound();

            if (p.SKU != dto.SKU && await _db.Products.AnyAsync(x => x.SKU == dto.SKU))
                return Conflict($"SKU '{dto.SKU}' już istnieje.");

            p.SKU = dto.SKU;
            p.Name = dto.Name;
            p.Price = dto.Price;
            p.Stock = dto.Stock;

            await _db.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var p = await _db.Products.FirstOrDefaultAsync(x => x.Id == id);
            if (p is null) return NotFound();
            _db.Products.Remove(p);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
