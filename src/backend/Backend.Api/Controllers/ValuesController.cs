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
            // check if sku exists
            if (await _db.Products.AnyAsync(x => x.SKU == dto.SKU))
                return Conflict($"SKU '{dto.SKU}' already exist.");

            // check if category exists
            var categoryExists = await _db.Categories.AnyAsync(c => c.Id == dto.CategoryId);
            if (!categoryExists)
                return BadRequest($"CategoryId {dto.CategoryId} does not exist.");

            // create product
            var p = new Product
            {
                SKU = dto.SKU.Trim(),
                Name = dto.Name.Trim(),
                Description = dto.Description!.Trim(),
                Price = dto.Price,
                CategoryId = dto.CategoryId
            };

            // save
            _db.Products.Add(p);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = p.Id }, p);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] CreateProductDto dto)
        {
            // check if product exists
            var p = await _db.Products.FirstOrDefaultAsync(x => x.Id == id);
            if (p is null) return NotFound();

            // check if SKU is changing and if new SKU already exists
            if (p.SKU != dto.SKU && await _db.Products.AnyAsync(x => x.SKU == dto.SKU))
                return Conflict($"SKU '{dto.SKU}' already exist.");

            // check if category exists
            var categoryExists = await _db.Categories.AnyAsync(c => c.Id == dto.CategoryId);
            if (!categoryExists) return BadRequest($"CategoryId {dto.CategoryId} does not exist.");

            // update fields
            p.SKU = dto.SKU;
            p.Name = dto.Name;
            p.Price = dto.Price;
            p.CategoryId = dto.CategoryId;

            // description is optional to update - if null than keep old
            if (!string.IsNullOrWhiteSpace(dto.Description))
                p.Description = dto.Description!;

            // save
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
