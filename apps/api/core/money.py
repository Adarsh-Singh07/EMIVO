"""Indian-format currency helpers shared by email, WhatsApp and chat text.

One formatter so a customer sees the same ₹1,19,900 everywhere — Python's
built-in `:,` grouping renders 119,900 (western thousands), which never
matches the storefront's en-IN display.
"""


def format_inr_paise(paise: float | int | None, decimals: bool = False) -> str:
    """Format an amount of paise as Indian-grouped rupees: ₹1,19,900.50.

    Indian grouping: the first group holds 3 digits, later groups hold 2
    (1,00,000 = one lakh; 1,00,00,000 = one crore).
    """
    if paise is None:
        paise = 0
    rupees = float(paise) / 100
    sign = "-" if rupees < 0 else ""
    rupees = abs(rupees)
    whole = int(rupees)
    frac = round((rupees - whole) * 100)

    def _group(n: int) -> str:
        if n < 1000:
            return str(n)
        # last three digits, then pairs
        head, tail = divmod(n, 1000)
        groups = [f"{tail:03d}"]
        while head >= 100:
            head, pair = divmod(head, 100)
            groups.append(f"{pair:02d}")
        groups.append(str(head))
        return ",".join(reversed(groups))

    out = f"{sign}₹{_group(whole)}"
    if decimals or frac:
        out += f".{frac:02d}"
    return out
