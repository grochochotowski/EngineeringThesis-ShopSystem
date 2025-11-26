using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")] // .../api/Addresses
    public class AddressesController : ControllerBase
    {
        private readonly IAddressService _service;
        public AddressesController(IAddressService service) => _service = service;

        // --- CREATE ADDRESS ---
        [HttpPost]
        public async Task<ActionResult<GetAddressDto>> Create([FromBody] CreateAddressDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            var created = await _service.CreateAsync(dto, ct);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }

        // --- GET ADDRESS BY ID ---
        [HttpGet("{id:int}")]
        public async Task<ActionResult<GetAddressDto>> GetById([FromRoute] int id, CancellationToken ct)
        {
            var addr = await _service.GetByIdAsync(id, ct);
            return addr is null ? NotFound() : Ok(addr);
        }

        // --- GET ALL ADDRESSES (paginated) ---
        [HttpGet]
        public async Task<ActionResult<PagedResult<GetAddressDto>>> GetAll(
            [FromQuery] PaginationParams @params,
            [FromQuery] Country? country,
            [FromQuery] string? city,
            [FromQuery] string? search,
            [FromQuery] string? orderBy,
            [FromQuery] string? sortDirection,
            CancellationToken ct)
        {
            var result = await _service.GetAllAsync(@params, country, city, search, orderBy, sortDirection, ct);
            return Ok(result);
        }

        // --- UPDATE ADDRESS ---
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateAddressDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            var ok = await _service.UpdateAsync(id, dto, ct);
            return ok ? NoContent() : NotFound();
        }

        // --- CHECK ADDRESS EXISTENCE ---
        [HttpGet("exists")]
        public async Task<ActionResult<object>> AddressExistsAsync([FromQuery] AddressExistenceDto dto, CancellationToken ct)
        {
            var (exists, id) = await _service.AddressExistsAsync(dto, ct);
            return Ok(new { exists, id });
        }

        // --- GET ALL COUNTRY NAMES ---
        [AllowAnonymous]
        [HttpGet("countries")]
        public ActionResult<IEnumerable<string>> GetCountries()
        {
            var countries = Enum.GetNames(typeof(Country));
            return Ok(countries);
        }
    }
}
