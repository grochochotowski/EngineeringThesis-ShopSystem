using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Backend.Api.Api.Controllers
{
    [ApiController]
    [Route("api/salesdocuments/{salesDocumentId:int}/payments")]
    public class SalesPaymentController : ControllerBase
    {
        private readonly ISalesPaymentService _service;
        public SalesPaymentController(ISalesPaymentService service) => _service = service;

        [HttpGet]
        public async Task<ActionResult<IEnumerable<GetSalesPaymentDto>>> GetByDocument(int salesDocumentId, CancellationToken ct)
            => Ok(await _service.GetByDocumentAsync(salesDocumentId, ct));

        [HttpGet("{id:int}")]
        public async Task<ActionResult<GetSalesPaymentDto>> GetById(int id, CancellationToken ct)
        {
            var dto = await _service.GetByIdAsync(id, ct);
            return dto is null ? NotFound() : Ok(dto);
        }

        [HttpPost]
        public async Task<ActionResult<int>> Create(int salesDocumentId, [FromBody] CreateSalesPaymentDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            var id = await _service.CreateAsync(salesDocumentId, dto, ct);
            return CreatedAtAction(nameof(GetById), new { id, salesDocumentId }, id);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateSalesPaymentDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            await _service.UpdateAsync(id, dto, ct);
            return NoContent();
        }
    }
}