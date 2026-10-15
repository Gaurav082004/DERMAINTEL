# DERMAINTEL

## AI-Assisted Dermatology Monitoring and Lifestyle Recommendation Platform

DERMAINTEL is a web-based, AI-assisted platform that analyzes uploaded
skin images and combines the predicted skin category with environmental
and lifestyle information to estimate a skin-risk score and provide
recommendations. It is an academic prototype, not a medical diagnostic
device.

## Project objectives

-   Classify an uploaded skin image into **Acne, Eczema, Alopecia, or
    Healthy Skin**.
-   Estimate a contextual risk score using the predicted condition and
    environmental/lifestyle inputs.
-   Provide recommendations based on the prediction and context.
-   Use Grad-CAM to visualize image regions that influenced the CNN
    prediction.
-   Separate the web interface, application API, ML inference service,
    and database.

## Key features

-   React-based user interface.
-   Express API for application requests, authentication, communication
    with the ML service, and relevant persistence.
-   Flask inference service using a TensorFlow/Keras CNN.
-   Test-Time Augmentation (TTA) where enabled by the inference
    implementation.
-   MLP-based risk estimation using five contextual factors.
-   Grad-CAM visual explanations.
-   MongoDB persistence according to the configured backend.
-   Production architecture using Vercel, Render, and Azure.

## System architecture

``` text
Browser
  |
  v
React frontend (Vercel in production)
  |
  v
Node.js / Express API (Render in production)
  |                         |
  |                         +--> MongoDB Atlas
  |
  v
Python / Flask ML service (Azure in production)
  |
  +--> Image preprocessing
  +--> CNN classification
  +--> MLP risk estimation
  +--> Risk tier and recommendations
  +--> Grad-CAM explanation
  |
  v
Prediction response returned through Express to React
```

The frontend sends the image and contextual values to Express. Express
forwards the inference request to Flask. Flask performs image
classification, estimates risk, prepares recommendations, and attempts
to generate a Grad-CAM explanation. Express returns the result to the
frontend and persists relevant prediction information according to the
backend implementation.

## Risk estimation

The risk model uses the final predicted condition and these contextual
inputs:

-   Temperature
-   Humidity
-   UV index
-   Air quality (AQI/PM2.5)
-   Stress level

The MLP uses an eight-value input: five contextual values and a
three-value one-hot representation for Acne, Alopecia, and Eczema.
Healthy Skin bypasses the MLP and receives a score of `0` and a `Low`
tier.

Risk tiers:

-   **Low:** score ≤ 33
-   **Medium:** score \> 33 and ≤ 66
-   **High:** score \> 66

The risk score is an engineering estimate for this project and is not
clinically validated. It must not be used as a substitute for advice
from a qualified healthcare professional.

## Technology stack

  Component            Technologies
  -------------------- -----------------------------
  Frontend             React, JavaScript, npm
  Application API      Node.js, Express
  ML API               Python, Flask
  Image classifier     TensorFlow/Keras CNN
  Risk estimator       Multilayer Perceptron (MLP)
  Explainability       Grad-CAM
  Persistence          MongoDB
  Production hosting   Vercel, Render, Azure

Use each service's dependency manifests as the source of truth for exact
package versions.

## Repository layout

The project has used the following service directories. Confirm the
current checkout before running commands:

```text
DERMAINTEL/
├── dermaintel-api/                 # Python / Flask ML inference service
│   ├── __pycache__/                # Generated Python cache (not committed)
│   ├── artifacts/                  # CNN, MLP, and scaler artifacts
│   ├── src/                        # ML support modules
│   ├── venv/                       # Local Python environment (not committed)
│   ├── app.py                      # Flask inference API
│   ├── config.py                   # Service configuration
│   ├── download_models.py          # Model download helper
│   ├── requirements.txt            # Python dependencies
│   └── runtime.txt                 # Runtime configuration
├── dermaintel-frontend-auth/       # React frontend and authentication UI
├── dermaintel-ml/                  # Training notebooks and ML scripts
├── express-backend/
│   └── backend/                    # Node.js / Express application backend
│       ├── node_modules/            # Installed packages (not committed)
│       ├── src/
│       │   ├── app.js               # Express app and middleware
│       │   ├── auth.js              # Authentication routes/logic
│       │   ├── database.js          # Database connection
│       │   └── server.js            # Backend server entry point
│       ├── .env.example             # Example environment variables
│       ├── package.json             # Node.js dependencies and scripts
│       └── package-lock.json        # Locked dependency versions
├── API_CONTRACT.md                 # API integration documentation
├── README.md                       # Project documentation
└── package-lock.json               # Root-level lockfile, if applicable
```

The exact contents can vary by branch. Confirm the current structure in
the repository.

## Prerequisites

-   Git
-   Node.js and npm
-   Python
-   MongoDB (local or MongoDB Atlas)
-   Required CNN, MLP, and scaler artifacts, if not included in the
    repository

The model artifacts must match the code that loads them. The application
may not run if required artifacts are absent.

## Local setup

### 1. Clone the repository

``` bash
git clone <REPOSITORY_URL>
cd DERMAINTEL
```

### 2. Install and configure the React frontend

In the current auth-oriented layout, the frontend has been located at
`dermaintel-frontend-auth/dermaintel-frontend`.

``` bash
cd dermaintel-frontend-auth/dermaintel-frontend
npm install
```

Create the frontend environment file expected by the code. The known
frontend API variable is:

``` env
VITE_API_URL=http://localhost:5001
```

Run the frontend using the script defined in that directory's
`package.json`, commonly:

``` bash
npm run dev
```

### 3. Install and configure the Express API

Open a second terminal:

``` bash
cd dermaintel-api
npm install
```

Create a local `.env` file using the names required by the current
backend. Known configuration names include:

``` env
PORT=5001
FLASK_URL=http://127.0.0.1:5000
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=<YOUR_MONGODB_CONNECTION_STRING>
```

Authentication, email, or OAuth-related variables may also be required
by the current branch. Inspect the current configuration before starting
the service. Never commit real secrets.

Start the API using the script defined in `dermaintel-api/package.json`.
Do not assume a script name without checking the package manifest.

### 4. Configure and run the Flask ML service

Open a third terminal. Use the Python version and dependencies specified
by the project.

``` bash
cd dermaintel-api
python -m venv .venv
```

Activate on Windows:

``` bat
.venv\Scripts\activate
```

Install dependencies from the project's requirements file, if present:

``` bash
pip install -r requirements.txt
```

Ensure the required CNN, MLP, and scaler artifacts are available at the
paths expected by the code. Configure any additional required
environment variables after checking `app.py` and the model-loading
modules.

Run the Flask service using the repository's configured entry point. If
`app.py` is the entry point, the command may be:

``` bash
python app.py
```

The known local arrangement is React on port `5173`, Express on port
`5001`, and Flask on port `5000`; verify these values against the
current code.

## Environment configuration

Variable names can differ between branches and services. Check the
current source before deployment.

  ------------------------------------------------------------------------------------
  Variable                Purpose                 Example / placeholder
  ----------------------- ----------------------- ------------------------------------
  `VITE_API_URL`          Express API base URL    `http://localhost:5001`
                          for the frontend        

  `PORT`                  Express listening port, `5001`
                          if read by the app      

  `FLASK_URL`             Flask service URL used  `http://127.0.0.1:5000`
                          by Express              

  `CLIENT_ORIGIN`         Allowed frontend origin `http://localhost:5173`
                          for CORS                

  `MONGODB_URI`           MongoDB connection      `<YOUR_MONGODB_CONNECTION_STRING>`
                          string                  
  ------------------------------------------------------------------------------------

Other variables may be required for authentication, email delivery,
OAuth, or ML configuration. Verify their names in the current source.
Keep `.env` files out of version control.

## API overview

The Express prediction endpoint accepts multipart form data containing
an image and contextual inputs. See [API_CONTRACT.md](API_CONTRACT.md)
for the known request fields, response structure, and integration notes.
Verify route definitions in the current checkout before relying on
endpoint details.

## Deployment overview

The intended production split is:

-   **Frontend:** Vercel
-   **Express application API:** Render
-   **Flask ML inference service:** Azure
-   **Database:** MongoDB Atlas

Set production environment variables in the hosting provider dashboards.
Configure CORS and cookie settings for the deployed origins, and ensure
the Express service can reach Flask and MongoDB. Do not expose secrets
in frontend variables unless they are designed to be public.

## Documentation maintenance

Keep this README aligned with the checked-out branch. Confirm route
names, package scripts, Python dependencies, environment variables, and
artifact paths against the actual source before treating these
instructions as definitive.
