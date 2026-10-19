using UnityEngine;
using UnityEngine.InputSystem;

/// <summary>
/// Player-controlled interceptor missile. Launch is explicit; after launch the camera
/// follows the missile and the player must steer into a target to score a hit.
/// Attach to a missile prefab with a Rigidbody and Collider.
/// </summary>
[RequireComponent(typeof(Rigidbody), typeof(Collider))]
public sealed class MissileFlightController : MonoBehaviour
{
    [Header("Flight")]
    [SerializeField] float acceleration = 32f;
    [SerializeField] float maxSpeed = 115f;
    [SerializeField] float turnRate = 78f;
    [SerializeField] float lifetime = 18f;
    [SerializeField] Transform cameraMount;
    [SerializeField] ParticleSystem exhaust;
    [SerializeField] AudioSource engineAudio;
    [Header("Runtime")]
    [SerializeField] bool launched;
    Rigidbody body;
    Camera flightCamera;
    float age;
    float steerX, steerY, roll, throttle = .65f;

    public bool IsLaunched => launched;
    public System.Action<MissileFlightController> TimedOut;
    public System.Action<MissileFlightController, Collider> DirectHit;

    void Awake()
    {
        body = GetComponent<Rigidbody>();
        body.useGravity = false;
        body.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;
        body.interpolation = RigidbodyInterpolation.Interpolate;
        body.isKinematic = true;
        if (!flightCamera) flightCamera = Camera.main;
    }

    public void Launch(Transform launchPoint)
    {
        if (launched) return;
        if (launchPoint) transform.SetPositionAndRotation(launchPoint.position, launchPoint.rotation);
        launched = true; age = 0f; body.isKinematic = false;
        body.velocity = transform.forward * 28f;
        if (exhaust) exhaust.Play();
        if (engineAudio) engineAudio.Play();
        if (flightCamera)
        {
            flightCamera.transform.SetParent(cameraMount ? cameraMount : transform, false);
            flightCamera.transform.localPosition = new Vector3(0f, .55f, -5.2f);
            flightCamera.transform.localRotation = Quaternion.Euler(4f, 0f, 0f);
        }
    }

    // UI joysticks call this with normalized values in [-1, 1].
    public void SetControls(float horizontal, float vertical, float bank, float power)
    {
        steerX = Mathf.Clamp(horizontal, -1, 1);
        steerY = Mathf.Clamp(vertical, -1, 1);
        roll = Mathf.Clamp(bank, -1, 1);
        throttle = Mathf.Clamp01(power);
    }

    void FixedUpdate()
    {
        if (!launched) return;
        age += Time.fixedDeltaTime;
        if (age >= lifetime) { TimedOut?.Invoke(this); return; }

        var input = new Vector3(steerY, steerX, -roll);
        var rotation = Quaternion.Euler(input.x * turnRate * Time.fixedDeltaTime,
                                        input.y * turnRate * Time.fixedDeltaTime,
                                        input.z * turnRate * Time.fixedDeltaTime);
        body.MoveRotation(body.rotation * rotation);
        var desiredSpeed = Mathf.Lerp(28f, maxSpeed, throttle);
        body.velocity = Vector3.Lerp(body.velocity, transform.forward * desiredSpeed,
                                     1f - Mathf.Exp(-acceleration * Time.fixedDeltaTime));
    }

    void OnCollisionEnter(Collision collision)
    {
        if (!launched) return;
        DirectHit?.Invoke(this, collision.collider);
        if (flightCamera) flightCamera.transform.SetParent(null, true);
        Destroy(gameObject);
    }
}