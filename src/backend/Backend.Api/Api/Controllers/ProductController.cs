using Backend.Api.Api.Controllers;
using Backend.Api.Objects.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers
{
    namespace Backend.Api.Controllers
    {
        [ApiController]
        [Route("api/[controller]")] // /api/products
        public class ProductsController : ControllerBase
        {
            private readonly IProductService _service;
            public ProductsController(IProductService service) => _service = service;

            [HttpPost]
            public async Task<ActionResult<GetProductDto>> Create([FromBody] CreateProductDto dto, CancellationToken ct)
            {
                if (!ModelState.IsValid) return ValidationProblem(ModelState);
                try
                {
                    var created = await _service.CreateAsync(dto, ct);
                    return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
                }
                catch (InvalidOperationException ex)
                {
                    return Conflict(new { message = ex.Message });
                }
            }

            [HttpGet("{id:int}")]
            public async Task<ActionResult<GetProductDto>> GetById([FromRoute] int id, CancellationToken ct)
            {
                var prod = await _service.GetByIdAsync(id, ct);
                return prod is null ? NotFound() : Ok(prod);
            }

            [HttpGet]
            public async Task<ActionResult<IEnumerable<GetProductDto>>> GetAll(CancellationToken ct)
            {
                var list = await _service.GetAllAsync(ct);
                return Ok(list);
            }

            [HttpPut("{id:int}")]
            public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateProductDto dto, CancellationToken ct)
            {
                if (!ModelState.IsValid) return ValidationProblem(ModelState);
                try
                {
                    var ok = await _service.UpdateAsync(id, dto, ct);
                    return ok ? NoContent() : NotFound();
                }
                catch (InvalidOperationException ex)
                {
                    return Conflict(new { message = ex.Message });
                }
            }

            [HttpDelete("{id:int}")]
            public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken ct)
            {
                try
                {
                    var ok = await _service.DeleteAsync(id, ct);
                    return ok ? NoContent() : NotFound();
                }
                catch (DbUpdateException)
                {
                    return Conflict(new { message = "Cannot delete product due to related data." });
                }
            }
        }
    }
}
