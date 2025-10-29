using Backend.Api.Api.Controllers;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")] // /api/warehouses
    public class WarehouseController : ControllerBase
    {
        private readonly IWarehouseService _service;
        public WarehouseController(IWarehouseService service) => _service = service;

        // POST /api/warehouses
        [HttpPost]
        public async Task<ActionResult<GetWarehouseDto>> Create([FromBody] CreateWarehouseDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            var created = await _service.CreateAsync(dto, ct);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }

        // GET /api/warehouses/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult<GetWarehouseDto>> GetById([FromRoute] int id, CancellationToken ct)
        {
            var w = await _service.GetByIdAsync(id, ct);
            return w is null ? NotFound() : Ok(w);
        }

        // GET /api/warehouses
        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<GetWarehouseDto>>> GetAll(CancellationToken ct)
        {
            var list = await _service.GetAllAsync(ct);
            return Ok(list);
        }

        // PUT /api/warehouses/{id}
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateWarehouseDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            var ok = await _service.UpdateAsync(id, dto, ct);
            return ok ? NoContent() : NotFound();
        }

        // DELETE /api/warehouses/{id}
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken ct)
        {
            var ok = await _service.DeleteAsync(id, ct);
            return ok ? NoContent() : NotFound();
        }

        // GET /api/warehouses/{warehouseId}/products/{productId}
        [HttpGet("{warehouseId:int}/products/{productId:int}")]
        public async Task<ActionResult<GetWarehouseProductItemDto>> GetProductById([FromRoute] int productId, [FromRoute] int warehouseId, CancellationToken ct)
        {
            var item = await _service.GetProductByIdAsync(productId, warehouseId, ct);
            return item is null ? NotFound() : Ok(item);
        }

        // GET /api/warehouses/{warehouseId}/products
        [HttpGet("{warehouseId:int}/products")]
        public async Task<ActionResult<IReadOnlyList<GetWarehouseProductItemDto>>> GetProductsFromWarehouse([FromRoute] int warehouseId, CancellationToken ct)
        {
            var items = await _service.GetProductsFromWarehouseAsync(warehouseId, ct);
            return Ok(items);
        }

        // POST /api/warehouses/{warehouseId}/products
        [HttpPost("{warehouseId:int}/products")]
        public async Task<IActionResult> AddProduct([FromRoute] int warehouseId, [FromBody] AddProductToWarehouseDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            await _service.AddProductToWarehouseAsync(warehouseId, dto, ct);
            return NoContent();
        }

        // DELETE /api/warehouses/{warehouseId}/products
        [HttpDelete("{warehouseId:int}/products")]
        public async Task<IActionResult> RemoveProduct([FromRoute] int warehouseId, [FromBody] RemoveProductFromWarehouseDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            await _service.RemoveProductFromWarehouseAsync(warehouseId, dto, ct);
            return NoContent();
        }
    }
}