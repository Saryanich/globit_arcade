using UnityEngine;

/// <summary>Damageable building facade with window materials and staged destruction.</summary>
public sealed class DestructibleBuilding : MonoBehaviour
{
    [SerializeField] float maxHealth = 100f;
    [SerializeField] GameObject explosionPrefab;
    [SerializeField] GameObject rubblePrefab;
    [SerializeField] AudioClip impactSound;
    [SerializeField] AudioClip collapseSound;
    float health;
    bool destroyed;

    void Awake() => health = maxHealth;

    public void ApplyDamage(float damage, Vector3 impactPoint, float radius = 0f)
    {
        if (destroyed || damage <= 0f) return;
        health = Mathf.Max(0f, health - damage);
        if (health <= 0f) Collapse(impactPoint);
        else FlickerWindows();
    }

    void FlickerWindows()
    {
        foreach (var renderer in GetComponentsInChildren<Renderer>())
        {
            if (!renderer || !renderer.sharedMaterial) continue;
            if (renderer.sharedMaterial.name.ToLowerInvariant().Contains("window"))
            {
                var m = renderer.material;
                if (m.HasProperty("_EmissionColor"))
                    m.SetColor("_EmissionColor", new Color(1f, .13f, .025f) * 2.2f);
            }
        }
    }

    void Collapse(Vector3 point)
    {
        if (destroyed) return;
        destroyed = true;
        if (explosionPrefab) Instantiate(explosionPrefab, point, Quaternion.identity);
        if (collapseSound) AudioSource.PlayClipAtPoint(collapseSound, transform.position, .9f);
        if (rubblePrefab) Instantiate(rubblePrefab, transform.position, transform.rotation);
        Destroy(gameObject);
    }

    void OnCollisionEnter(Collision collision)
    {
        if (collision.collider.GetComponent<MissileFlightController>() ||
            collision.collider.GetComponent<AirTargetFlightAI>())
        {
            var point = collision.contactCount > 0 ? collision.GetContact(0).point : transform.position;
            ApplyDamage(55f, point);
            if (impactSound) AudioSource.PlayClipAtPoint(impactSound, point, .8f);
        }
    }
}