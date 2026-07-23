export const receiptTemplate = (payment) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
body{
    font-family: Arial,sans-serif;
    padding:40px;
}
h1{
    color:#059669;
}
table{
    width:100%;
    border-collapse:collapse;
}
td{
    padding:10px;
    border-bottom:1px solid #ddd;
}
</style>
</head>

<body>

<h1>Prescripto+</h1>

<h2>Payment Receipt</h2>

<table>

<tr>
<td>Receipt ID</td>
<td>${payment.id}</td>
</tr>

<tr>
<td>Patient</td>
<td>${payment.patient.name}</td>
</tr>

<tr>
<td>Doctor</td>
<td>${payment.doctor.user.name}</td>
</tr>

<tr>
<td>Amount</td>
<td>₹${payment.amount}</td>
</tr>

<tr>
<td>Provider</td>
<td>${payment.provider}</td>
</tr>

<tr>
<td>Status</td>
<td>${payment.status}</td>
</tr>

</table>

</body>
</html>
`;