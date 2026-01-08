app.get("/checkout", (req, res) => {
  const { service, network, product, amount, user } = req.query;
  const finalAmount = Number(amount).toFixed(2);

  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>CoinTop - Checkout</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{
  margin:0;
  font-family:'Segoe UI',sans-serif;
  background: linear-gradient(120deg,#141e30,#243b55);
  background-size: 400% 400%;
  animation: gradientBG 20s ease infinite;
  color:#fff;
  display:flex;
  justify-content:center;
  align-items:center;
  min-height:100vh;
}
@keyframes gradientBG{
  0%{background-position:0 50%;}
  50%{background-position:100% 50%;}
  100%{background-position:0 50%;}
}
.container{
  background:#111;
  border-radius:25px;
  max-width:450px;
  width:95%;
  padding:30px;
  box-shadow:0 15px 40px rgba(0,0,0,0.6);
  animation:fadeIn 1s ease-in;
}
@keyframes fadeIn{
  0%{opacity:0;transform:translateY(20px);}
  100%{opacity:1;transform:translateY(0);}
}
h2{text-align:center;color:#00ffcc;margin-bottom:10px;}
p{text-align:center;color:#aaa;margin:5px 0;}
.amount{font-size:18px;color:#00ffcc;margin:10px 0;text-align:center;font-weight:bold;}
.instructions{
  background:#1c1c1c;
  padding:15px;
  border-radius:15px;
  margin-top:15px;
  font-size:14px;
  animation:fadeIn 1.2s ease-in;
}
.status{margin-top:15px;text-align:center;font-size:16px;color:#00ffcc;}
button{
  padding:12px 18px;
  border:none;
  border-radius:12px;
  background:#00ffcc;
  color:#111;
  font-weight:bold;
  cursor:pointer;
  transition:0.3s;
  width:100%;
  margin-top:15px;
  box-shadow:0 6px 20px rgba(0,255,204,0.5);
}
button:hover{
  transform:scale(1.05);
  background:#00ddb3;
  box-shadow:0 8px 25px rgba(0,255,204,0.6);
}
.footer{text-align:center;margin-top:20px;font-size:12px;color:#aaa;}
</style>
</head>
<body>
<div class="container">
<h2>Checkout - ${service}</h2>
<p><b>Product:</b> ${product}${network? ' ('+network+')':''}</p>
<p class="amount">₦${finalAmount}</p>

<div class="instructions">
<p>Send exactly <b>₦${finalAmount}</b> to:</p>
<p><b>Damilola Fadiora</b></p>
<p><b>Kuda MFB</b></p>
<p><b>2035470845</b></p>
</div>

<div class="status" id="status">⏳ Awaiting admin...</div>
<button onclick="window.location='/'">Back Home</button>
<div class="footer">Contact Admin: <a href="https://t.me/TyburnUK" style="color:#00ffcc;">Telegram</a></div>
</div>

<script>
function checkStatus(){
  fetch("/order-status/${Date.now()}")
  .then(res=>res.json())
  .then(data=>{
    document.getElementById("status").textContent = data.status==="sent"?"✅ Credited!":"⏳ Awaiting admin...";
    if(data.status!=="sent") setTimeout(checkStatus,3000);
  });
}
window.onload=checkStatus;
</script>
</body>
</html>
  `);
});
