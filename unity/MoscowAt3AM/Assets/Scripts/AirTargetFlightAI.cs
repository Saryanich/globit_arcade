using UnityEngine;

/// <summary>Airborne targets follow non-repeating, bounded 3D flight paths.</summary>
public sealed class AirTargetFlightAI : MonoBehaviour
{
    public enum TargetKind { Drone, Shahed, Rocket, Boss }
    [SerializeField] TargetKind kind;
    [SerializeField] Vector3 arenaMin = new(-95, 12, -180);
    [SerializeField] Vector3 arenaMax = new(95, 90, 25);
    [SerializeField] float speed = 14f;
    [SerializeField] float turnResponsiveness = 1.8f;
    [SerializeField] Transform cityAimPoint;
    [SerializeField] float attackInterval = 7f;
    [SerializeField] GameObject projectilePrefab;
    [SerializeField] Transform weaponMuzzle;
    float nextAttack;
    Vector3 waypoint;
    float chooseAgain;
    float phase;

    public TargetKind Kind => kind;
    public System.Action<AirTargetFlightAI> ReachedCity;

    void Start()
    {
        phase = Random.value * 100f;
        ChooseWaypoint();
        nextAttack = Time.time + Random.Range(2f, attackInterval);
    }

    void Update()
    {
        if (Time.time >= chooseAgain || Vector3.Distance(transform.position, waypoint) < 8f)
            ChooseWaypoint();

        Vector3 direction = (waypoint - transform.position).normalized;
        if (direction.sqrMagnitude > .01f)
        {
            Quaternion targetRotation = Quaternion.LookRotation(direction, Vector3.up);
            transform.rotation = Quaternion.Slerp(transform.rotation, targetRotation,
                1f - Mathf.Exp(-turnResponsiveness * Time.deltaTime));
            transform.position += transform.forward * speed * Time.deltaTime;
        }

        // Small organic deviations; no fixed circular orbit.
        transform.position += new Vector3(Mathf.Sin(Time.time * .71f + phase), 
            Mathf.Sin(Time.time * 1.13f + phase) * .22f,
            Mathf.Cos(Time.time * .59f + phase)) * Time.deltaTime * .65f;

        if (Time.time >= nextAttack && projectilePrefab && weaponMuzzle && cityAimPoint)
        {
            nextAttack = Time.time + Random.Range(attackInterval * .65f, attackInterval * 1.45f);
            var projectile = Instantiate(projectilePrefab, weaponMuzzle.position,
                Quaternion.LookRotation((cityAimPoint.position - weaponMuzzle.position).normalized));
            if (projectile.TryGetComponent<Rigidbody>(out var rb))
                rb.velocity = projectile.transform.forward * (kind == TargetKind.Boss ? 36f : 24f);
        }

        if (transform.position.z > arenaMax.z + 10f)
            ReachedCity?.Invoke(this);
    }

    void ChooseWaypoint()
    {
        waypoint = new Vector3(Random.Range(arenaMin.x, arenaMax.x),
            Random.Range(arenaMin.y, arenaMax.y), Random.Range(arenaMin.z, arenaMax.z));
        chooseAgain = Time.time + Random.Range(2.4f, 6.5f);
    }
}