const authenticateUser = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }
  
    const token = authHeader.split(" ")[1]; // Extract token
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      req.user = decoded; // Store decoded user info in request
      next();
    } catch (error) {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
  };
  